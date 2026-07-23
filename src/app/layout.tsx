import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { APPLICATION } from "@/constants/application";
import { AppProviders } from "@/providers";
import { cn } from "@/lib/utils";
import "./globals.css";
import "@/styles/tokens.css";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: APPLICATION.name,
    template: `%s · ${APPLICATION.shortName}`,
  },
  description: "Enterprise rental management system for Manyar Tent Service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full antialiased", hankenGrotesk.variable)}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
