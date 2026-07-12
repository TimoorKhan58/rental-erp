import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APPLICATION } from "@/constants/application";
import { AppProviders } from "@/providers";
import { cn } from "@/lib/utils";
import "./globals.css";
import "@/styles/tokens.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: APPLICATION.name,
  description: `Enterprise rental management system for ${APPLICATION.client}`,
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
      className={cn("h-full antialiased", inter.variable)}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
