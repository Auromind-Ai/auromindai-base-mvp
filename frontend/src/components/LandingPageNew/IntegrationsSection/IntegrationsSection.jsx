"use client";

import { useState } from "react";
import { useBranding } from "@/context/BrandingContext";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

// ─── All apps across 4 rows — all using local SVG icons ────────────────────
const ROW_1 = [
  { name: "Instagram",      img: "/images/integrations/instagram.png",      featured: true  },
  { name: "WhatsApp",       img: "/images/integrations/whatsapp.png",       featured: true  },
  { name: "Gmail",          img: "/images/integrations/gmail.png",          featured: true  },
  { name: "Google Cal.",    img: "/images/integrations/google_calendar.png",featured: true  },
  { name: "Twilio",         img: "/images/integrations/twilio_fixed.svg",   featured: true  },
  { name: "Facebook",       img: "/images/integrations/facebook.svg"        },
  { name: "LinkedIn",       img: "/images/integrations/linkedin.svg"        },
  { name: "X (Twitter)",    img: "/images/integrations/twitter.svg"         },
  { name: "YouTube",        img: "/images/integrations/youtube.svg"         },
  { name: "TikTok",         img: "/images/integrations/tiktok.svg"          },
];
const ROW_2 = [
  { name: "Slack",          img: "/images/integrations/slack.svg"           },
  { name: "Telegram",       img: "/images/integrations/telegram.svg"        },
  { name: "Outlook",        img: "/images/integrations/outlook.svg"         },
  { name: "HubSpot",        img: "/images/integrations/hubspot.svg"         },
  { name: "Mailchimp",      img: "/images/integrations/mailchimp.svg"       },
  { name: "Google Drive",   img: "/images/integrations/gdrive.svg"          },
  { name: "Dropbox",        img: "/images/integrations/dropbox.svg"         },
  { name: "MS Teams",       img: "/images/integrations/teams.svg"           },
  { name: "Discord",        img: "/images/integrations/discord.svg"         },
  { name: "Notion",         img: "/images/integrations/notion.svg"          },
];
const ROW_3 = [
  { name: "Airtable",       img: "/images/integrations/airtable.svg"        },
  { name: "Trello",         img: "/images/integrations/trello.svg"          },
  { name: "Asana",          img: "/images/integrations/asana.svg"           },
  { name: "Salesforce",     img: "/images/integrations/salesforce.svg"      },
  { name: "Zoho CRM",       img: "/images/integrations/zoho.svg"            },
  { name: "Pipedrive",      img: "/images/integrations/pipedrive.svg"       },
  { name: "Stripe",         img: "/images/integrations/stripe.svg"          },
  { name: "PayPal",         img: "/images/integrations/paypal.svg"          },
  { name: "WooCommerce",    img: "/images/integrations/woocommerce.svg"     },
  { name: "Shopify",        img: "/images/integrations/shopify.svg"         },
];
const ROW_4 = [
  { name: "Google Sheets",  img: "/images/integrations/gsheets.svg"         },
  { name: "Google Docs",    img: "/images/integrations/gdocs.svg"           },
  { name: "Typeform",       img: "/images/integrations/typeform.svg"        },
  { name: "Calendly",       img: "/images/integrations/calendly.svg"        },
  { name: "Zapier",         img: "/images/integrations/zapier.svg"          },
  { name: "OpenAI",         img: "/images/integrations/openai.svg"          },
  { name: "Zendesk",        img: "/images/integrations/zendesk.svg"         },
  { name: "Monday.com",     img: "/images/integrations/mondaydotcom.svg"    },
  { name: "ClickUp",        img: "/images/integrations/clickup.svg"         },
  { name: "Jira",           img: "/images/integrations/jira.svg"            },
];

const ALL_ROWS = [
  { items: ROW_1, dir: "left",  speed: 35 },
  { items: ROW_2, dir: "right", speed: 45 },
  { items: ROW_3, dir: "left",  speed: 38 },
  { items: ROW_4, dir: "right", speed: 42 },
];

// ─── Single icon tile ────────────────────────────────────────────────────────
function AppIcon({ app }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex-shrink-0 w-[72px] h-[72px] rounded-[18px] mx-[6px] flex flex-col items-center justify-center gap-[5px] cursor-default overflow-hidden border-[1.5px] transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
        hovered
          ? "scale-110 -translate-y-[3px] bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "scale-100"
      } ${
        app.featured
          ? "bg-white/[0.07] border-violet-500/35 shadow-[0_0_16px_rgba(139,92,246,0.18)]"
          : "bg-white/[0.04] border-white/[0.08]"
      }`}
    >
      {/* subtle shimmer on featured */}
      {app.featured && (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(139,92,246,0.12)_0%,transparent_60%)]" />
      )}
      <img
        src={app.img}
        alt={app.name}
        className="relative w-[38px] h-[38px] object-contain"
        onError={(e) => { e.currentTarget.style.opacity = "0.3"; }}
      />
    </div>
  );
}

// ─── Infinite scrolling row ───────────────────────────────────────────────────
function MarqueeRow({ items, dir, speed }) {
  // triple-clone for seamless loop
  const clone = [...items, ...items, ...items];
  const anim  = dir === "left" ? "scrollLeft" : "scrollRight";

  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="flex w-max"
        style={{ animation: `${anim} ${speed}s linear infinite` }}
      >
        {clone.map((app, i) => (
          <AppIcon key={`${app.name}-${i}`} app={app} />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function IntegrationsSection() {
  const { appName } = useBranding();

  return (
    <section
      className={`${poppins.className} relative overflow-hidden bg-[#050505] border-b border-white/[0.04]`}
    >
      {/* ── Ambient blobs ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(109,40,217,0.14)_0%,transparent_70%)]" />
        <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.10)_0%,transparent_70%)]" />
      </div>

      {/* ── Main two-column layout ──────────────────────────────── */}
      <div className="integ-grid relative z-[2] grid grid-cols-2 min-h-[520px] max-w-[1280px] mx-auto">
        {/* LEFT — Text content */}
        <div className="relative z-10 flex flex-col justify-center px-8 py-[72px] pl-8 pr-12">
          {/* COMING SOON pill */}
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/30 bg-[linear-gradient(135deg,rgba(251,191,36,0.15)_0%,rgba(245,158,11,0.08)_100%)] px-[14px] py-[5px]">
            <span className="text-xs">✦</span>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-400">
              200+ Apps · Coming Soon
            </span>
            <span className="text-xs">✦</span>
          </div>

          {/* Integrations pill badge */}
          <div className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-violet-500/[0.28] bg-violet-500/[0.12] px-[14px] py-[6px]">
            <span className="inline-block h-[7px] w-[7px] animate-[blink_1.8s_ease-in-out_infinite] rounded-full bg-violet-300" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-300">
              Integrations
            </span>
          </div>

          {/* Headline */}
          <h2 className="m-0 mb-2 text-[clamp(2rem,3.5vw,3rem)] font-bold leading-[1.15] text-white">
            Connect every tool<br />your team loves
          </h2>

          {/* Subheading gradient */}
          <p className="m-0 mb-5 bg-[linear-gradient(90deg,#a855f7_0%,#818cf8_100%)] bg-clip-text text-[clamp(1.1rem,2vw,1.4rem)] font-bold text-transparent">
            One AI. Infinite Connections.
          </p>

          {/* Description */}
          <p className="mb-9 max-w-[420px] text-[15px] leading-[1.7] text-slate-400">
            {appName} plugs into your entire stack — WhatsApp, Gmail, Instagram, Google Calendar, Twilio, and 200+ more. One platform, every conversation, fully automated.
          </p>

          {/* Featured apps row */}
          <div className="mb-9 flex flex-wrap items-center gap-[10px]">
            {[
              { img: "/images/integrations/instagram.png",       name: "Instagram"       },
              { img: "/images/integrations/whatsapp.png",        name: "WhatsApp"        },
              { img: "/images/integrations/gmail.png",           name: "Gmail"           },
              { img: "/images/integrations/google_calendar.png", name: "Google Calendar" },
              { img: "/images/integrations/twilio.png",          name: "Twilio"          },
            ].map((a) => (
              <div
                key={a.name}
                title={a.name}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/[0.12] bg-white/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
              >
                <img src={a.img} alt={a.name} className="h-6 w-6 object-contain" />
              </div>
            ))}
            <span className="text-[13px] font-medium text-slate-500">+ 200 more</span>
          </div>
        </div>

        {/* RIGHT — Scrolling icon grid */}
        <div className="relative overflow-hidden">
          {/* Left fade mask */}
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-[5] w-20 bg-[linear-gradient(90deg,#060412_0%,transparent_100%)]" />
          {/* Right fade mask */}
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-[5] w-[60px] bg-[linear-gradient(270deg,#060412_0%,transparent_100%)]" />

          {/* Rows container */}
          <div className="flex h-full flex-col justify-center gap-[10px] py-12">
            {ALL_ROWS.map((row, i) => (
              <MarqueeRow key={i} items={row.items} dir={row.dir} speed={row.speed} />
            ))}
          </div>
        </div>
      </div>

      {/* ── CSS animations ───────────────────────────────────────── */}
      <style>{`
        @keyframes scrollLeft {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes scrollRight {
          0%   { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }

        @media (max-width: 768px) {
          .integ-grid {
            grid-template-columns: 1fr !important;
          }
          .feature-pills-grid {
            grid-template-columns: repeat(2,1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}