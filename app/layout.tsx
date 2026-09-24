import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
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
  title: { default: "Reel Log", template: "%s · Reel Log" },
  description: "Track movies you've watched, keep a watchlist, rate and review.",
  // The app ships its own dark theme; stop Dark Reader from rewriting styles,
  // which also causes hydration mismatches.
  other: { "darkreader-lock": "true" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
          Scores from Rotten Tomatoes and Metacritic via OMDb.
        </footer>
      </body>
    </html>
  );
}
