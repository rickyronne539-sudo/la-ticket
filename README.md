# LA Tickets

Online ticket booking for LA events. Built with Next.js 16 (App Router), TypeScript, MongoDB + Prisma 6, and Stripe Checkout.

## Setup

1. Create a free **MongoDB Atlas** cluster. Prisma needs a replica set, which Atlas has by default.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `TICKET_SECRET` and `CRON_SECRET`.
3. Install, create indexes, and seed the demo events:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Without `STRIPE_SECRET_KEY`, dev mode confirms orders without payment.

### Stripe (test mode)

Add `STRIPE_SECRET_KEY` to `.env`, then forward webhooks locally with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Put the `whsec_…` secret it prints into `STRIPE_WEBHOOK_SECRET`. Pay with the test card `4242 4242 4242 4242`.

## How booking works

1. **Hold**: `createHold` (`src/lib/booking.ts`) atomically decrements `TicketType.available`
   with `updateMany({ where: { available: { gte: qty } } })`. If two buyers race for the last ticket, only one succeeds.
   If any ticket type in the order is short, the ones already taken are returned.
2. **Pay**: A PENDING order is created with a 30-minute hold, and the buyer is sent to Stripe Checkout.
3. **Confirm**: `checkout.session.completed` hits `/api/stripe/webhook` → `confirmOrder` marks the order PAID and
   issues tickets with QR codes. It's idempotent, and ticket codes are deterministic, so webhook retries can't duplicate tickets.
   If a hold expired before payment arrived and the tickets have since sold out, the payment is refunded automatically.
4. **Release**: Cancelled checkouts, `checkout.session.expired` events, and `/api/cron/expire-holds` put held tickets
   back on sale. Stale holds are also cleared before every new checkout.

Guests view their tickets at `/orders/[id]?t=<accessToken>`. The token is the secret in that link.

## Notes

- Schema changes: `npm run db:push` (Prisma Migrate doesn't support MongoDB).
- `vercel.json` runs the expiry cron every 5 minutes. Vercel's Hobby plan only allows daily crons, so use Pro or an
  external scheduler there. Checkout already clears stale holds, so this is a backstop.
- The seed events are demo data. Don't sell tickets to real events unless you're the organizer or a partner.

## Roadmap

- Email tickets (Resend) after payment
- Accounts (Auth.js) and a "My tickets" page
- Admin: create and edit events and ticket types, view sales
- Door check-in scanner (mark `Ticket.checkedInAt`)
