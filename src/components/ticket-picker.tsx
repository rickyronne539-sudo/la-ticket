"use client";

import { useActionState, useState } from "react";
import { startCheckout, type CheckoutState } from "@/app/events/[slug]/actions";
import { formatPrice } from "@/lib/format";

type TicketTypeOption = {
  id: string;
  name: string;
  priceCents: number;
  available: number;
  maxPerOrder: number;
};

export function TicketPicker({
  eventId,
  ticketTypes,
  devPayments,
}: {
  eventId: string;
  ticketTypes: TicketTypeOption[];
  devPayments: boolean;
}) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const total = ticketTypes.reduce((sum, t) => sum + t.priceCents * (quantities[t.id] ?? 0), 0);
  const count = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />

      <ul className="divide-y divide-black/10 dark:divide-white/10">
        {ticketTypes.map((t) => {
          const max = Math.min(t.available, t.maxPerOrder);
          return (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-sm opacity-70">
                  {t.priceCents === 0 ? "Free" : formatPrice(t.priceCents)}
                  {t.available === 0 ? " · Sold out" : t.available <= 20 ? ` · ${t.available} left` : ""}
                </p>
              </div>
              <input type="hidden" name="ticketTypeId" value={t.id} />
              <select
                name="quantity"
                aria-label={`Quantity for ${t.name}`}
                disabled={max === 0}
                value={quantities[t.id] ?? 0}
                onChange={(e) => setQuantities((q) => ({ ...q, [t.id]: Number(e.target.value) }))}
                className="rounded-md border border-black/15 bg-transparent px-2 py-1 disabled:opacity-40 dark:border-white/15"
              >
                {Array.from({ length: max + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Email for your tickets</span>
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
        />
      </label>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || count === 0}
        className="w-full rounded-md bg-foreground px-4 py-2.5 font-medium text-background disabled:opacity-40"
      >
        {pending ? "Reserving…" : count === 0 ? "Select tickets" : `Checkout · ${formatPrice(total)}`}
      </button>

      <p className="text-xs opacity-60">
        Tickets are held for 30 minutes while you pay.
        {devPayments && " Dev mode: Stripe isn't configured, so orders are confirmed without payment."}
      </p>
    </form>
  );
}
