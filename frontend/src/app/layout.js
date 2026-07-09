import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export const metadata = {
  metadataBase: new URL("https://orbionagents.com/"),
  title: {
    default: "Auromind AI | Secure AI Business Assistant",
    template: "%s | Auromind AI",
  },
  description: "Scale customer interactions safely. Auromind AI uses governed RAG agents and visual flow builders to automate sales, support, and lead qualification.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Auromind AI | Secure AI Business Assistant",
    description: "Scale customer interactions safely. Auromind AI uses governed RAG agents and visual flow builders to automate sales, support, and lead qualification.",
    url: "https://orbionagents.com/",
    siteName: "Auromind AI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Auromind AI | Secure AI Business Assistant",
    description: "Scale customer interactions safely. Auromind AI uses governed RAG agents and visual flow builders to automate sales, support, and lead qualification.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${poppins.variable}`}
        suppressHydrationWarning
      >
        <BrandingProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}