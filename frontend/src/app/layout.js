import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Providers from "./providers";
import Preloader from "@/components/Preloader";

export const metadata = {
  title: "Auromind AI - v1.1.16",
  description: "Secure AI Business Assistant (v1.1.16)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable}`}
        suppressHydrationWarning
      >
        <div id="fb-root"></div>
        <Preloader />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}