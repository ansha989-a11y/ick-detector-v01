import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // Helper to set plan
  async function setPlan(userId: string, plan: "free" | "pro", subscriptionId?: string | null) {
    await supabaseServer
      .from("profiles")
      .update({
        plan,
        stripe_subscription_id: subscriptionId ?? null,
      })
      .eq("id", userId);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subId = typeof session.subscription === "string" ? session.subscription : null;

    // Get user id from subscription metadata (most reliable)
    if (subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = sub.metadata?.supabase_user_id;
      if (userId) await setPlan(userId, "pro", subId);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;

    if (userId) {
      const isActive = sub.status === "active" || sub.status === "trialing";
      await setPlan(userId, isActive ? "pro" : "free", isActive ? sub.id : null);
    }
  }

  return new Response("ok", { status: 200 });
}
