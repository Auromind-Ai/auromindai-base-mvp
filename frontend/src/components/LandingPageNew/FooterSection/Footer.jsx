"use client";

const footerLinks = {
  Links: ["Services", "Process", "Case studies", "Benefits", "Pricing"],
  Pages: ["Home", "About", "Blog", "Contact"],
  Socials: ["Instagram", "Facebook", "Linkedin", "Twitter"],
};

export default function Footer() {
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
      <div className="max-w-none px-[84px] pt-[69px] pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_220px_220px_220px] gap-x-[42px] gap-y-10 items-start justify-between">

          {/* Column 1 — Brand */}
          <div className="flex flex-col gap-5">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#814AC8" }}
              >
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
              </div>
              <span
                className="text-white text-2xl font-bold tracking-tight"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Auromind
              </span>
            </div>

            {/* Description */}
            <p
              className="text-sm leading-relaxed max-w-[260px]"
              style={{ color: "#A1A1AA", fontFamily: "'Poppins', sans-serif" }}
            >
              Auromind – Automate Smarter, Optimize Faster, and Grow Stronger.
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

          
            <div className="flex gap-10 overflow-x-auto pb-2 lg:contents">
              {Object.entries(footerLinks).map(([heading, items]) => (
                <div key={heading} className="flex flex-col min-w-[120px] shrink-0 lg:min-w-0">
                  <h4
                    className="text-white font-semibold text-sm mb-[14px]"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    {heading}
                  </h4>

                  <ul className="flex flex-col gap-2.5">
                    {items.map((item) => (
                      <li key={item}>
                        <a
                          href="#"
                          className="text-sm transition-all duration-150 hover:text-white hover:translate-x-0.5 inline-block"
                          style={{
                            color: "#A1A1AA",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
      </div>
    </footer>
  );
}