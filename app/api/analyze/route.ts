import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function getMondayUTC(d = new Date()) {
  // Monday of current week in UTC (simple + consistent)
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function clampInput(s: string, maxChars = 2500) {
  const trimmed = (s || "").trim();
  return trimmed.length > maxChars ? trimmed.slice(0, maxChars) : trimmed;
}

export async function POST(req: Request) {
  try {
    // 1) Auth: get Supabase access token from header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return new Response("Missing auth token", { status: 401 });

    const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return new Response("Unauthorized", { status: 401 });

    // 2) Read request body
    const body = await req.json().catch(() => null);
    const tone = (body?.tone || "blunt").toString();
    const input_text = clampInput((body?.input_text || "").toString(), 2500);

    if (input_text.length < 10) {
      return Response.json({ error: "Please paste a bit more detail." }, { status: 400 });
    }

    // 3) Load profile (plan + weekly counter)
    const { data: profile, error: profileErr } = await supabaseServer
      .from("profiles")
      .select("id, plan, week_start_date, readings_this_week")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return new Response("Profile not found", { status: 400 });
    }

    // 4) Weekly reset if needed
    const thisMonday = getMondayUTC();
    let week_start_date = profile.week_start_date as string;
    let readings_this_week = profile.readings_this_week as number;

    if (!week_start_date || week_start_date < thisMonday) {
      week_start_date = thisMonday;
      readings_this_week = 0;
      await supabaseServer
        .from("profiles")
        .update({ week_start_date, readings_this_week })
        .eq("id", user.id);
    }

    // 5) Enforce free limit (1/week)
    const plan = (profile.plan || "free") as "free" | "pro";
    if (plan === "free" && readings_this_week >= 1) {
      return Response.json(
        {
          blocked: true,
          reason: "free_limit",
          message: "You’ve used your free reading for this week. Go Pro for unlimited.",
        },
        { status: 402 }
      );
    }

    // 6) Call OpenAI (JSON output)
    const system = `
You are The Ick Detector: blunt-but-empathetic dating and friendship pattern decoder.
No diagnosing. No medical/therapy claims. No hate. No shaming.
Be clear, emotionally intelligent, Gen Z–Millennial friendly, NOT cringe.
Return ONLY valid JSON matching the schema.`;

    const schemaHint = `
JSON schema:
{
  "blunt_take": string,
  "ick_score": number,          // 0-100
  "category": "red_flag" | "incompatibility" | "overthinking",
  "pattern": string,
  "why_it_feels_bad": string,
  "reality_check": string,
  "what_to_watch_for_next": string[],
  "petty_icks_for_fun": string[]
}
Rules:
- Keep blunt_take <= 1 sentence.
- ick_score integer 0-100.
- what_to_watch_for_next: 3-5 bullets.
- petty_icks_for_fun: 0-3 bullets, optional fun, not mean.
`;

    const userPrompt = `
Tone mode: ${tone}
Situation:
${input_text}

${schemaHint}
`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      text: { format: { type: "json_object" } },
    });

    const raw = resp.output_text?.trim() || "{}";
    let output: any;
    try {
      output = JSON.parse(raw);
    } catch {
      output = { blunt_take: "Try again.", ick_score: 50, category: "overthinking" };
    }

    // 7) Save reading
    const { error: insertErr } = await supabaseServer.from("readings").insert({
      user_id: user.id,
      tone,
      input_text,
      output_json: output,
      ick_score: output?.ick_score ?? null,
      category: output?.category ?? null,
    });

    if (insertErr) {
      return Response.json({ error: "Failed to save reading." }, { status: 500 });
    }

    // 8) Increment weekly counter for free users
    if (plan === "free") {
      await supabaseServer
        .from("profiles")
        .update({ readings_this_week: readings_this_week + 1 })
        .eq("id", user.id);
    }

    // 9) Return result
    return Response.json({ ok: true, plan, result: output });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
