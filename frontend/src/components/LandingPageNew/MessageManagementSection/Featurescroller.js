"use client";

import { motion } from "framer-motion";
import styles from "./section.module.css";

export const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 10h8M8 13h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Smart Inbox",
    desc: "View every customer conversation across WhatsApp, Instagram and Telegram from one place.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l1.8 5.4h5.7l-4.6 3.4 1.8 5.4L12 14.4l-4.7 2.8 1.8-5.4L4.5 8.4h5.7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="4" r="1.5" fill="currentColor" />
        <circle cx="5" cy="20" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: "Instant AI Replies",
    desc: "Generate accurate replies in seconds using your business knowledge and previous chats.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Auto Lead Assignment",
    desc: "Automatically assign new leads to the correct sales team member based on rules.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M23 4v6h-6M1 20v-6h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Follow-up Automation",
    desc: "Send reminders and follow-ups automatically when leads stop responding to you.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
    title: "Priority Lead Detection",
    desc: "Detect high-intent leads instantly and surface them to the top of your inbox.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 20V10M12 20V4M6 20v-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Analytics & Response Time",
    desc: "Track performance, response speed and conversion rates across all conversations.",
  },
];

export function FeatureScroller() {
  const doubled = [...FEATURES, ...FEATURES];

  return (
    <div className={styles.scrollerOuter}>
      {/* Badge row sits inside the container box, above the scroller */}
      <div className={styles.badgeRow}>
        <span className={styles.badge}>Features</span>
        <span className={styles.badgeSub}>Ready for Review</span>
      </div>

      <div className={styles.scrollerMask}>
        <div className={styles.scrollerTrack}>
          {doubled.map((f, i) => (
            <motion.div
              key={i}
              className={styles.featureCard}
              whileHover={{
                backgroundColor: "rgba(255,255,255,0.04)",
                transition: { duration: 0.2, ease: "easeOut" },
              }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>{f.icon}</div>
                <div className={styles.cardTitle}>{f.title}</div>
              </div>
              <div className={styles.cardDesc}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}