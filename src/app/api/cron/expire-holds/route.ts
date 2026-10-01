import { expireStaleHolds } from "@/lib/booking";

// Called on a schedule (see vercel.json). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const expired = await expireStaleHolds();
  return Response.json({ expired });
}
