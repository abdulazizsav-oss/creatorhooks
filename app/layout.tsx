import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";

import "./globals.css";

const outfitSans = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono"
});

export const metadata: Metadata = {
  title: "HOOK",
  description: "Telegram Mini App for short-form script and hook generation."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${outfitSans.variable} ${jetBrainsMono.variable} bg-paper font-sans text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
