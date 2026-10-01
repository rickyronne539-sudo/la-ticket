import type Stripe from "stripe";
import { confirmOrder, releaseOrder } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// Orders are only ever marked PAID here, never on the success page:
// the buyer may close the tab before being redirected.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !secret || !signature) return new Response("Not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) return Response.json({ received: true });

  switch (event.type) {
    case "checkout.session.completed": {
      if (session.payment_status !== "paid") break;
      const result = await confirmOrder(orderId, session.id);
      if (result === "sold_out" && session.payment_intent) {
        // Hold expired and the tickets were sold to someone else meanwhile.
        await stripe.refunds.create({ payment_intent: String(session.payment_intent) });
        await prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
      }
      break;
    }
    case "checkout.session.expired":
      await releaseOrder(orderId);
      break;
  }

  return Response.json({ received: true });
}
