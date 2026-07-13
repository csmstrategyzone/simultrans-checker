import type { Metadata } from "next";
import { Inter_Tight, Playfair_Display, JetBrains_Mono } from "next/font/google";
import { FluidCanvas } from "@/components/fluid-canvas";
import { ScrollProgress } from "@/components/scroll-progress";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// The linguist's voice ONLY: the word "meaning" and verdict quotes. Nowhere else.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SimulTrans Checker — AI translates words. Linguists translate meaning.",
  description:
    "See what machine translation misses. Run any content through an ISO 17100-certified quality lens in 30 seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${playfair.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ScrollProgress />
        <FluidCanvas />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
