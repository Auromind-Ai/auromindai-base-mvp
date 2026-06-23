import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";


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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}