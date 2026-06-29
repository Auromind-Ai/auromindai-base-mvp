"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useBranding } from '@/context/BrandingContext';

const footerLinks = {
  Links: [
    { name: "Services", href: "/#demo" },
    { name: "Process", href: "/#process" },
    { name: "Case studies", href: "/resources/case-studies" },
    { name: "Benefits", href: "/#benefits" },
    { name: "Pricing", href: "/#pricing" },
  ],
  Pages: [
    { name: "Home", href: "/" },
    { name: "About", href: "/" },
    { name: "Blog", href: "/resources/blog" },
    { name: "Contact", href: "mailto:auromindaipvtltd@gmail.com" },
  ],
  Socials: [
    { name: "Instagram", href: "https://instagram.com" },
    { name: "Facebook", href: "https://facebook.com" },
    { name: "Linkedin", href: "https://linkedin.com" },
    { name: "Twitter", href: "https://twitter.com" },
  ],
};

export default function Footer() {
  const { appName, appLogoUrl } = useBranding();
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [appLogoUrl]);

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
      <div className="max-w-none px-4 sm:px-6 md:px-8 lg:px-[84px] pt-12 lg:pt-[69px] pb-16 lg:pb-20">
        <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-[1.3fr_220px_220px_220px] gap-x-[42px] items-start justify-between">

          {/* Column 1 — Brand */}
          <div className="flex flex-col gap-5">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#814AC8" }}
              >
                {appLogoUrl && !logoError ? (
                  <img 
                    src={appLogoUrl} 
                    alt={appName} 
                    className="w-5 h-5 object-contain" 
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                )}
              </div>
              <span
                className="text-white text-2xl font-bold tracking-tight"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {appName}
              </span>
            </div>

            {/* Description */}
            <p
              className="text-sm leading-relaxed max-w-[260px]"
              style={{ color: "#A1A1AA", fontFamily: "'Poppins', sans-serif" }}
            >
              {appName} – Automate Smarter, Optimize Faster, and Grow Stronger.
            </p>

            {/* Contact */}
            <div className="mt-2">
              <p
                className="text-white font-semibold text-m mb-1"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Contact
              </p>
              <a
                href="mailto:auromindaipvtltd@gmail.com"
                className="text-sm transition-colors duration-150 hover:text-white"
                style={{ color: "#A1A1AA", fontFamily: "'Poppins', sans-serif" }}
              >
                auromindaipvtltd@gmail.com
              </a>
            </div>
          </div>
          
            <div className="grid grid-cols-3 gap-x-6 gap-y-8 lg:contents">
              {Object.entries(footerLinks).map(([heading, items]) => (
                  <div key={heading} className="flex flex-col min-w-[120px] shrink-0 lg:min-w-0">
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
      </div>
    </footer>
  );
}