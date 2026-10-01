// Imports upcoming events from the Ticketmaster Discovery API (https://developer.ticketmaster.com).
// Imported events link to Ticketmaster for tickets; nothing is sold for them on this site.
//
//   npm run tm:sync
//
// Needs TICKETMASTER_API_KEY in .env. TICKETMASTER_KEYWORD picks what to import (default "Post Malone").
// Events Ticketmaster no longer returns are unpublished; their rows stay for any past orders.
import { PrismaClient, type Category } from "@prisma/client";

const prisma = new PrismaClient();

const apiKey = process.env.TICKETMASTER_API_KEY;
const keyword = process.env.TICKETMASTER_KEYWORD || "Post Malone";

type TmVenue = {
  name?: string;
  address?: { line1?: string };
  city?: { name?: string };
  timezone?: string;
};
type TmEvent = {
  id: string;
  name: string;
  url: string;
  info?: string;
  pleaseNote?: string;
  dates: { start: { dateTime?: string; localDate?: string }; timezone?: string; status?: { code?: string } };
  classifications?: { segment?: { name?: string } }[];
  _embedded?: { venues?: TmVenue[] };
};
type TmPage = { _embedded?: { events: TmEvent[] }; page: { number: number; totalPages: number } };

const categories: Record<string, Category> = {
  Music: "CONCERT",
  Sports: "SPORTS",
  "Arts & Theatre": "THEATRE",
  Family: "FAMILY",
};

async function fetchEvents() {
  const events: TmEvent[] = [];
  // The API serves at most 1,000 results (size × page).
  for (let page = 0; page < 5; page++) {
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.search = new URLSearchParams({ apikey: apiKey!, keyword, size: "200", page: String(page), sort: "date,asc" }).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ticketmaster API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as TmPage;
    events.push(...(data._embedded?.events ?? []));
    if (page + 1 >= data.page.totalPages) break;
  }
  return events;
}

function toEvent(tm: TmEvent) {
  const venue = tm._embedded?.venues?.[0];
  const timezone = tm.dates.timezone ?? venue?.timezone ?? "UTC";
  // Date-only listings ("time TBA") get noon UTC so they land on the right day.
  const startsAt = tm.dates.start.dateTime ?? (tm.dates.start.localDate && `${tm.dates.start.localDate}T12:00:00Z`);
  if (!startsAt) return null;
  return {
    slug: `tm-${tm.id}`.toLowerCase(),
    title: tm.name,
    description: tm.info ?? tm.pleaseNote ?? `${tm.name} at ${venue?.name ?? "venue TBA"}. Tickets are sold on Ticketmaster.`,
    category: categories[tm.classifications?.[0]?.segment?.name ?? ""] ?? "ARTS",
    venue: {
      name: venue?.name ?? "Venue TBA",
      address: venue?.address?.line1 ?? "",
      city: venue?.city?.name ?? "",
      timezone,
    },
    startsAt: new Date(startsAt),
    externalUrl: tm.url,
    published: tm.dates.status?.code !== "cancelled",
  };
}

async function main() {
  if (!apiKey) throw new Error("Set TICKETMASTER_API_KEY in .env (free key at https://developer.ticketmaster.com).");
  const found = (await fetchEvents()).map(toEvent).filter((e) => e !== null);

  for (const event of found) {
    await prisma.event.upsert({ where: { slug: event.slug }, update: event, create: event });
  }
  const hidden = await prisma.event.updateMany({
    where: { slug: { startsWith: "tm-", notIn: found.map((e) => e.slug) } },
    data: { published: false },
  });
  console.log(`Imported ${found.length} Ticketmaster events for "${keyword}", unpublished ${hidden.count}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
