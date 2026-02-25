import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  // Expect Authorization: Bearer <supabase_access_token>
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return new Response("Missing auth token", { status: 401 });

  const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token);
  if (userErr || !userData?.user) return new Response("Unauthorized", { status: 401 });

  const user = userData.user;

  // Fetch profile (to reuse Stripe customer if it exists)
  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId =
    profile?.stripe_customer_id ||
    (
      await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
    ).id;

  // Save customerId if we just created it
  if (!profile?.stripe_customer_id) {
    await supabaseServer.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl}/?success=1`,
    cancel_url: `${appUrl}/?canceled=1`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  });

  return Response.json({ url: session.url });
}
