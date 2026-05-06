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
      <body>
        <Header />
        <main className="max-w-[680px] mx-auto">
          {children}
        </main>
        <CookieConsent />
      </body>
    </html>
  );
}
