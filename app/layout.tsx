import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import CookieConsent from "./components/CookieConsent";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kith",
  description: "Some things are too heavy for one person.",
  openGraph: {
    title: "Kith",
    description: "Some things are too heavy for one person.",
    type: "website",
    url: "https://kith.support",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="max-w-[680px] mx-auto w-full flex-1">
          {children}
        </main>
        <footer className="flex items-center justify-center gap-2 text-xs text-stone-400 py-6 px-6">
          <a href="/privacy" className="hover:text-stone-600 transition-colors">Privacy</a>
          <span aria-hidden="true">·</span>
          <a href="/terms" className="hover:text-stone-600 transition-colors">Terms</a>
          <span aria-hidden="true">·</span>
          <a href="/guidelines" className="hover:text-stone-600 transition-colors">Guidelines</a>
        </footer>
        <CookieConsent />
      </body>
    </html>
  );
}
