"use client";
import Link from 'next/link';
import { useBranding } from '@/context/BrandingContext';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const footerLinks = {
  Links: [
    { name: "Services", href: "/#demo" },
    { name: "Process", href: "/#process" },
    { name: "Case studies", href: "/resources/case-studies" },
    { name: "Benefits", href: "/#benefits" },
    { name: "Pricing", href: "/pricing" },
  ],
  Pages: [
    { name: "Home", href: "/" },
    { name: "About", href: "/" },
    { name: "Blog", href: "/resources/blog" },
    { name: "Contact", href: "mailto:orbionagents@gmail.com" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Data Deletion", href: "/data-deletion" },
  ],
};

export default function Footer() {
  const { appName } = useBranding();

  return (
    <footer
      className="w-full"
      style={{
  background: `
  radial-gradient(ellipse 40% 30% at 50% 0%, rgba(43, 25, 68, 0.98) 0%, transparent 100%),
  #080810
`,
}}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-12 lg:pt-[69px] pb-16 lg:pb-20">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-24 items-start justify-center w-full">

          {/* Column 1 — Brand */}
          <div className="flex flex-col gap-5 lg:mr-10 shrink-0">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/logo.png" 
                  alt={appName} 
                  className="h-[54px] w-auto object-contain" 
                />
                <span className={`${jakarta.className} text-[20px] font-extrabold tracking-[0.1em] text-white flex items-center`}>
                  ORBION
                  <span className="bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#818CF8] bg-clip-text text-transparent ml-2 font-semibold tracking-[0.15em]">
                    AGENTS
                  </span>
                </span>
              </div>
            </div>

            {/* Description */}
            <p
              className="text-sm leading-relaxed max-w-[260px]"
              style={{ color: "#A1A1AA", fontFamily: "'Poppins', sans-serif" }}
            >
              {appName} – Automate Smarter, Optimize Faster, and Grow Stronger.
            </p>

            <div className="mt-2">
              <p
                className="text-white font-semibold text-m mb-1"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Contact
              </p>
              <a
                href="mailto:orbionagents@gmail.com"
                className="text-sm transition-colors duration-150 hover:text-white"
                style={{ color: "#A1A1AA", fontFamily: "'Poppins', sans-serif" }}
              >
                orbionagents@gmail.com
              </a>
            </div>
          </div>
          
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-8 lg:flex lg:gap-20">
              {Object.entries(footerLinks).map(([heading, items]) => (
                  <div key={heading} className="flex flex-col shrink-0 min-w-[120px]">
                    <h4
                      className="text-white font-semibold text-[14px] sm:text-[15px] mb-3"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      {heading}
                    </h4>

                    <ul className="flex flex-col gap-2.5">
                      {items.map((item) => {
                        const isExternal = item.href.startsWith("http") || item.href.startsWith("mailto");
                        const linkProps = {
                          className: "text-sm transition-all duration-150 hover:text-white hover:translate-x-0.5 inline-block",
                          style: {
                            color: "#A1A1AA",
                            fontFamily: "'Poppins', sans-serif",
                          }
                        };
                        return (
                          <li key={item.name}>
                            {isExternal ? (
                              <a
                                href={item.href}
                                target={item.href.startsWith("http") ? "_blank" : undefined}
                                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                                {...linkProps}
                              >
                                {item.name}
                              </a>
                            ) : (
                              <Link href={item.href} {...linkProps}>
                                {item.name}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
              ))}
            </div>
          </div>

          {/* Bottom Bar: Copyright & Parent Link */}
          <div className="mt-12 pt-8 border-t border-white/[0.08] flex flex-col items-center justify-center text-center">
            <p
              className="text-sm"
              style={{ color: "#71717A", fontFamily: "'Poppins', sans-serif" }}
            >
              © {new Date().getFullYear()} {appName || "Orbion Agents"}. A product of{" "}
              <a
                href="https://auromindai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-150 hover:text-white underline decoration-zinc-700/50 underline-offset-4 font-medium"
              >
                AuromindAI Private Limited
              </a>
              . All rights reserved.
            </p>
          </div>
      </div>
    </footer>
  );
}