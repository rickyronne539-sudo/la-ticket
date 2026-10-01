import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { categoryLabels, formatDate } from "@/lib/format";
import { devPaymentsEnabled } from "@/lib/stripe";
import { TicketPicker } from "@/components/ticket-picker";

async function getEvent(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: { ticketTypes: { orderBy: { priceCents: "asc" } } },
  });
}

export async function generateMetadata(props: PageProps<"/events/[slug]">): Promise<Metadata> {
  const event = await getEvent((await props.params).slug);
  return { title: event?.title ?? "Event not found" };
}

export default async function EventPage(props: PageProps<"/events/[slug]">) {
  await connection(); // always render with live inventory
  const { slug } = await props.params;
  const { cancelled } = await props.searchParams;
  const event = await getEvent(slug);
  if (!event || !event.published) notFound();

  const past = event.startsAt < new Date();

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <article className="space-y-4">
        <span className="text-xs font-medium uppercase tracking-wide opacity-60">
          {categoryLabels[event.category]}
        </span>
        <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
        <div className="space-y-1 text-sm opacity-80">
          <p>{formatDate(event.startsAt, event.venue.timezone)}</p>
          <p>
            {event.venue.name} · {event.venue.address}, {event.venue.city}
          </p>
        </div>
        <p className="leading-relaxed">{event.description}</p>
      </article>

      <aside className="h-fit rounded-xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="mb-4 text-lg font-semibold">Tickets</h2>
        {cancelled && (
          <p className="mb-4 rounded-md bg-amber-500/10 px-3 py-2 text-sm">
            Checkout cancelled. Your tickets were released.
          </p>
        )}
        {past ? (
          <p className="opacity-70">This event has already taken place.</p>
        ) : event.externalUrl ? (
          <div className="space-y-3">
            <p className="text-sm opacity-80">Tickets for this event are sold by Ticketmaster.</p>
            <a href={event.externalUrl} target="_blank" rel="noreferrer" className="ticket-button">
              Buy on Ticketmaster <span aria-hidden="true">↗</span>
            </a>
          </div>
        ) : (
          <TicketPicker
            eventId={event.id}
            devPayments={devPaymentsEnabled}
            ticketTypes={event.ticketTypes.map((t) => ({
              id: t.id,
              name: t.name,
              priceCents: t.priceCents,
              available: t.available,
              maxPerOrder: t.maxPerOrder,
            }))}
          />
        )}
      </aside>
    </div>
  );
}
