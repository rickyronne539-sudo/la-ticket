import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Post Malone Tickets | LA Tickets", template: "%s | LA Tickets" },
  description: "Find Post Malone 2026 tour dates and book tickets.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <header className="site-header">
          <div className="utility-bar"><div className="page-width"><span>Live music. Unforgettable moments.</span><Link href="/#faqs">Help & FAQs</Link></div></div>
          <nav className="page-width main-nav" aria-label="Main navigation">
            <Link href="/" className="brand" aria-label="LA Tickets home">la<span>tickets</span><sup>®</sup></Link>
            <div className="main-nav-links"><Link href="/#tour-dates">Concerts</Link><Link href="/#gallery">Gallery</Link><Link href="/#about">Discover</Link></div>
            <Link href="/#tour-dates" className="header-search"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg> Find your next show</Link>
          </nav>
        </header>
        <main id="main-content" className="app-main">{children}</main>
        <footer className="site-footer">
          <div className="page-width footer-content"><div><Link href="/" className="brand">la<span>tickets</span></Link><p>Be there for the moments that matter.</p></div><div><h2>Explore</h2><Link href="/#tour-dates">Concerts</Link><Link href="/#gallery">Artist gallery</Link><Link href="/#about">About the artist</Link></div><div><h2>Need a hand?</h2><Link href="/#faqs">Ticketing FAQs</Link><Link href="/#tour-dates">Find a show</Link></div></div>
          <div className="page-width footer-bottom"><span>© {new Date().getFullYear()} LA Tickets</span><span>Demo ticketing app · Independent of Ticketmaster</span></div>
        </footer>
      </body>
    </html>
  );
}
