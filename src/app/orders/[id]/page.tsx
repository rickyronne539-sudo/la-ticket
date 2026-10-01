import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage(props: PageProps<"/orders/[id]">) {
  await connection();
  const { id } = await props.params;
  const { t } = await props.searchParams;
  if (!/^[a-f0-9]{24}$/.test(id) || typeof t !== "string") notFound();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { event: true, tickets: { include: { ticketType: true }, orderBy: { createdAt: "asc" } } },
  });
  // The access token in the URL is what lets a guest see their tickets.
  if (!order || order.accessToken !== t) notFound();

  const tickets = await Promise.all(
    order.tickets.map(async (ticket) => ({
      ...ticket,
      qr: await QRCode.toDataURL(ticket.code, { margin: 1, width: 220 }),
    })),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-sm opacity-60">Order {order.id.slice(-8).toUpperCase()}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{order.event.title}</h1>
        <p className="mt-2 opacity-80">
          {formatDate(order.event.startsAt)} · {order.event.venue.name}
        </p>
      </div>

      {order.status === "PENDING" && (
        <div className="rounded-xl border border-black/10 p-5 dark:border-white/10">
          <p className="font-medium">Confirming your payment…</p>
          <p className="mt-1 text-sm opacity-70">This usually takes a few seconds. The page updates on its own.</p>
          <AutoRefresh seconds={3} />
        </div>
      )}
      {order.status === "EXPIRED" && (
        <p className="rounded-xl bg-amber-500/10 p-5">This reservation expired before payment was completed.</p>
      )}
      {order.status === "REFUNDED" && (
        <p className="rounded-xl bg-amber-500/10 p-5">
          Sorry, these tickets sold out before your payment went through. You have been fully refunded.
        </p>
      )}

      {order.status === "PAID" && (
        <>
          <p className="rounded-xl bg-emerald-500/10 p-5">
            You&apos;re going! {tickets.length} ticket{tickets.length === 1 ? "" : "s"} for {order.email}. Show the QR
            code at the door. Bookmark this page to find your tickets again.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-col items-center rounded-xl border border-black/10 p-5 text-center dark:border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
                <img src={ticket.qr} alt={`QR code for ticket ${ticket.code}`} width={180} height={180} className="rounded bg-white p-2" />
                <p className="mt-3 font-medium">{ticket.ticketType.name}</p>
                <p className="font-mono text-xs opacity-60">{ticket.code}</p>
                {ticket.checkedInAt && <p className="mt-1 text-xs text-amber-600">Checked in</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
        {order.items.map((item) => (
          <div key={item.ticketTypeId} className="flex justify-between py-1">
            <span>
              {item.quantity} × {item.name}
            </span>
            <span>{formatPrice(item.priceCents * item.quantity)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-black/10 pt-2 font-semibold dark:border-white/10">
          <span>Total</span>
          <span>{formatPrice(order.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}
