import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { ConcertList } from "@/components/concert-list";
import { FavoriteButton } from "@/components/favorite-button";

const videos = [
  { id: "4QIZE708gJ4", title: "I Had Some Help", detail: "Featuring Morgan Wallen" },
  { id: "ApXoWvfEYVU", title: "Sunflower", detail: "Post Malone & Swae Lee" },
  { id: "SC4xMk98Pdc", title: "Congratulations", detail: "Featuring Quavo" },
];

export default async function Home() {
  await connection();
  const events = await prisma.event.findMany({
    where: { published: true, startsAt: { gte: new Date() } },
    include: { ticketTypes: { select: { name: true, priceCents: true, available: true } } },
    orderBy: { startsAt: "asc" },
  }).catch((error: unknown) => {
    console.error("Unable to load concert inventory", error);
    return null;
  });

  return (
    <div className="artist-page">
      <section className="artist-hero" aria-labelledby="artist-name">
        <Image src="/images/post-malone-hero.jpg" alt="Post Malone wearing a cowboy hat" fill preload sizes="100vw" className="hero-photo" />
        <div className="hero-shade" />
        <div className="page-width hero-content">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span><a href="#tour-dates">Concerts</a><span>/</span><span>Post Malone Tickets</span>
          </nav>
          <div className="artist-heading">
            <p>Hip-Hop / Rap</p>
            <h1 id="artist-name">Post Malone Tickets</h1>
            <div className="artist-meta"><FavoriteButton /><span>Music without boundaries. A night to remember.</span></div>
          </div>
        </div>
      </section>
      <nav className="artist-tabs" aria-label="Artist sections">
        <div className="page-width"><a href="#tour-dates">Concerts</a><a href="#gallery">Gallery</a><a href="#about">About</a><a href="#setlists">Setlists</a><a href="#news">News</a><a href="#faqs">FAQs</a></div>
      </nav>
      <div className="page-width artist-content">
        <ConcertList unavailable={events === null} events={(events ?? []).map((event) => ({ id: event.id, slug: event.slug, title: event.title, startsAt: event.startsAt.toISOString(), venue: event.venue, externalUrl: event.externalUrl, ticketTypes: event.ticketTypes }))} />
        <section id="gallery" className="artist-section">
          <div className="section-heading"><h2>Gallery</h2><span>A little preview of the live energy</span></div>
          <div className="gallery-grid">{videos.map((video) => (
            <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="video-card" aria-label={`Watch ${video.title} on YouTube (opens in a new tab)`}>
              <div className="video-image"><Image src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt={`${video.title} music video`} width={480} height={360} unoptimized /><span className="play-icon" aria-hidden="true">▶</span><span className="video-label">MUSIC VIDEO</span></div>
              <h3>Post Malone — {video.title}</h3><p>{video.detail} <span aria-hidden="true">↗</span></p>
            </a>
          ))}</div>
        </section>
        <section id="about" className="artist-section about-section">
          <div><p className="section-eyebrow">Behind the music</p><h2>About Post Malone</h2></div>
          <div><p>From the melodic rap of “White Iverson” to the country sound of <em>F-1 Trillion</em>, Post Malone makes music that crosses genres. His live shows bring those worlds together, with singalong favorites including “Circles,” “Sunflower,” and “Congratulations.”</p><p>Explore upcoming shows above, choose your city, and see available tickets for your next night of live music.</p><a className="text-link" href="https://www.postmalone.com/" target="_blank" rel="noreferrer">Visit artist website ↗</a></div>
        </section>
        <div className="editorial-grid">
          <section id="setlists" className="editorial-card"><p className="section-eyebrow">Get ready for the show</p><h2>Know every word.</h2><p>Explore past performances and discover which songs have made it to the stage.</p><a className="text-link" href="https://www.setlist.fm/search?query=Post+Malone" target="_blank" rel="noreferrer">Explore Post Malone setlists ↗</a></section>
          <section id="news" className="editorial-card"><p className="section-eyebrow">Stay in the loop</p><h2>More from Post Malone</h2><p>Catch up on music, videos, and announcements directly from the artist.</p><a className="text-link" href="https://www.postmalone.com/" target="_blank" rel="noreferrer">Artist news & updates ↗</a></section>
        </div>
        <section id="faqs" className="artist-section faq-section">
          <h2>Frequently asked questions</h2>
          <details><summary>How do I buy Post Malone tickets?</summary><p>Choose a show from the concert list and select Find Tickets. On the event page, choose an available ticket type and quantity, then continue to checkout.</p></details>
          <details><summary>Can I search for concerts in my city?</summary><p>Use the location field to filter by city or venue. You can also select a month or switch to the calendar to explore upcoming dates. All show times are displayed in the venue&apos;s local time.</p></details>
          <details><summary>Where can I find my tickets after checkout?</summary><p>After a successful payment, your order page shows your tickets and their QR codes. Keep the private link to that page so you can access your tickets again.</p></details>
          <details><summary>What happens if a show is sold out?</summary><p>Sold-out shows remain in the list with a View Details link. Availability can change when unpaid ticket holds expire, so check the event page again for the latest inventory.</p></details>
        </section>
      </div>
    </div>
  );
}
