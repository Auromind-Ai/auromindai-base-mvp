"use client";

import { useRef, useState } from "react";
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
      style={{
        flexShrink: 0,
        width: 72,
        height: 72,
        borderRadius: 18,
        margin: "0 6px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        background: hovered
          ? "rgba(255,255,255,0.1)"
          : app.featured
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.04)",
        border: app.featured
          ? "1.5px solid rgba(139,92,246,0.35)"
          : "1.5px solid rgba(255,255,255,0.08)",
        boxShadow: hovered
          ? "0 8px 32px rgba(0,0,0,0.5)"
          : app.featured
          ? "0 0 16px rgba(139,92,246,0.18)"
          : "none",
        transform: hovered ? "scale(1.1) translateY(-3px)" : "scale(1)",
        transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
        cursor: "default",
        backdropFilter: "blur(8px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* subtle shimmer on featured */}
      {app.featured && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />
      )}
      <img
        src={app.img}
        alt={app.name}
        style={{ width: 38, height: 38, objectFit: "contain", position: "relative" }}
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
    <div style={{ overflow: "hidden", width: "100%", position: "relative" }}>
      <div
        style={{
          display: "flex",
          width: "max-content",
          animation: `${anim} ${speed}s linear infinite`,
        }}
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
  const { appName, appLogoUrl } = useBranding();

  return (
    <section
      className={poppins.className}
      style={{
        background: "linear-gradient(160deg, #060412 0%, #0a0718 50%, #060412 100%)",
        overflow: "hidden",
        position: "relative",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* ── Ambient blobs ─────────────────────────────────────────── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "10%", left: "5%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(109,40,217,0.14) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "5%",
          width: 350, height: 350, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.10) 0%, transparent 70%)",
        }} />
      </div>

      {/* ── Main two-column layout ──────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: 520,
        maxWidth: 1280,
        margin: "0 auto",
        position: "relative",
        zIndex: 2,
      }}
        className="integ-grid"
      >
        {/* LEFT — Text content */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 48px 72px 32px",
          position: "relative",
          zIndex: 10,
        }}>
          {/* COMING SOON pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.08) 100%)",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 100, padding: "5px 14px",
            marginBottom: 12, width: "fit-content",
          }}>
            <span style={{ fontSize: 12 }}>✦</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "#fbbf24", textTransform: "uppercase" }}>
              200+ Apps · Coming Soon
            </span>
            <span style={{ fontSize: 12 }}>✦</span>
          </div>

          {/* Integrations pill badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.28)",
            borderRadius: 100, padding: "6px 14px",
            marginBottom: 20, width: "fit-content",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#a78bfa", display: "inline-block", animation: "blink 1.8s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#c4b5fd", textTransform: "uppercase" }}>
              Integrations
            </span>
          </div>

          {/* Headline */}
          <h2 style={{ fontSize: "clamp(2rem,3.5vw,3rem)", fontWeight: 800, color: "#fff", lineHeight: 1.15, margin: 0, marginBottom: 8 }}>
            Connect every tool<br />your team loves
          </h2>

          {/* Subheading gradient */}
          <p style={{
            fontSize: "clamp(1.1rem,2vw,1.4rem)",
            fontWeight: 700,
            margin: "0 0 20px",
            background: "linear-gradient(90deg,#a855f7 0%,#818cf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            One AI. Infinite Connections.
          </p>

          {/* Description */}
          <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.7, marginBottom: 36, maxWidth: 420 }}>
            {appName} plugs into your entire stack — WhatsApp, Gmail, Instagram, Google Calendar, Twilio, and 200+ more. One platform, every conversation, fully automated.
          </p>

          {/* Featured apps row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 36, flexWrap: "wrap" }}>
            {[
              { img: "/images/integrations/instagram.png",       name: "Instagram"       },
              { img: "/images/integrations/whatsapp.png",        name: "WhatsApp"        },
              { img: "/images/integrations/gmail.png",           name: "Gmail"           },
              { img: "/images/integrations/google_calendar.png", name: "Google Calendar" },
              { img: "/images/integrations/twilio.png",          name: "Twilio"          },
            ].map((a) => (
              <div key={a.name} title={a.name} style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              }}>
                <img src={a.img} alt={a.name} style={{ width: 24, height: 24, objectFit: "contain" }} />
              </div>
            ))}
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>+ 200 more</span>
          </div>


        </div>

        {/* RIGHT — Scrolling icon grid */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          {/* Left fade mask */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 80,
            background: "linear-gradient(90deg, #060412 0%, transparent 100%)",
            zIndex: 5, pointerEvents: "none",
          }} />
          {/* Right fade mask */}
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 60,
            background: "linear-gradient(270deg, #060412 0%, transparent 100%)",
            zIndex: 5, pointerEvents: "none",
          }} />

          {/* Rows container */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 10,
            padding: "48px 0",
            height: "100%",
          }}>
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
