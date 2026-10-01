"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BookingError, confirmOrder, createHold, expireStaleHolds, releaseOrder } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { devPaymentsEnabled, stripe } from "@/lib/stripe";

export type CheckoutState = { error?: string };

const checkoutSchema = z.object({
  eventId: z.string().regex(/^[a-f0-9]{24}$/),
  email: z.email("Enter a valid email address."),
  items: z
    .array(z.object({ ticketTypeId: z.string().regex(/^[a-f0-9]{24}$/), quantity: z.coerce.number().int().min(0).max(20) }))
    .min(1),
});

async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("host")}`;
}

export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const ticketTypeIds = formData.getAll("ticketTypeId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const parsed = checkoutSchema.safeParse({
    eventId: formData.get("eventId"),
    email: formData.get("email"),
    items: ticketTypeIds.map((ticketTypeId, i) => ({ ticketTypeId, quantity: quantities[i] })),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid request." };

  // Free up abandoned holds before reserving, so inventory isn't stuck waiting on the cron.
  await expireStaleHolds();

  let order;
  try {
    order = await createHold(parsed.data);
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    throw err;
  }

  const url = await baseUrl();
  const orderUrl = `${url}/orders/${order.id}?t=${order.accessToken}`;

  if (order.totalCents === 0) {
    // Free tickets: nothing to charge, Stripe doesn't accept $0 sessions.
    await confirmOrder(order.id);
    redirect(orderUrl);
  }

  if (!stripe) {
    if (!devPaymentsEnabled) {
      await releaseOrder(order.id);
      return { error: "Payments are not configured." };
    }
    await confirmOrder(order.id);
    redirect(orderUrl);
  }

  let checkoutUrl: string;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.priceCents,
          product_data: { name: `${order.event.title} — ${item.name}` },
        },
      })),
      metadata: { orderId: order.id },
      expires_at: Math.floor(order.expiresAt.getTime() / 1000),
      success_url: orderUrl,
      cancel_url: `${url}/api/orders/${order.id}/cancel?t=${order.accessToken}`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    checkoutUrl = session.url!;
  } catch (err) {
    await releaseOrder(order.id);
    console.error("Stripe checkout failed", err);
    return { error: "Could not start payment. Please try again." };
  }

  redirect(checkoutUrl);
}
