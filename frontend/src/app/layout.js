import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import AppSessionInit from "@/components/AppSessionInit";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Auromind AI - v1.1.16",
  description: "Secure AI Business Assistant (v1.1.16)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        {/*  Razorpay Script (FIXED) */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
        <AppSessionInit />

        {/* Announcement */}
        <AnnouncementBanner />

        {children}
      </body>
    </html>
  );
}
