import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { FluidCursor } from "@/components/fluid-cursor";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Headings (ITC Franklin Gothic) and body (Myriad Pro) are the official brand
// faces, self-hosted from /public/fonts via @font-face in globals.css. They were
// previously shadowed by Barlow Condensed / Source Sans 3 loaded from Google
// Fonts; those stand-ins are gone, so nothing competes with the real faces.

// Mono — scores and raw AI output only.
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
      className={`${plexMono.variable} h-full antialiased`}
    >
      {/* No background on <body> — see the note in globals.css. It would bury
          the FluidCursor ink layer, which sits at z-index -1. */}
      <body className="min-h-full flex flex-col">
        <FluidCursor />
        {children}
        <SiteFooter />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
