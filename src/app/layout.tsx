import type { Metadata } from "next";
import { Barlow_Condensed, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Headings — close free equivalent to ITC Franklin Gothic.
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Body — close free equivalent to Myriad Pro.
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Mono — scores and raw machine output only.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SimulTrans Checker. AI translates words. Linguists translate meaning.",
  description:
    "Preview what an AI thinks of any translation. See what a real SimulTrans linguist would catch. Request a full review from our certified team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${sourceSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">
        {children}
        <SiteFooter />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
