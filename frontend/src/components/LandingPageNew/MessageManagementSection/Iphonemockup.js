"use client";

import { motion } from "framer-motion";
import { AnimatedChat } from "./Animatedchat";
import styles from "./section.module.css";

export function IphoneMockup({ rotateX, rotateY }) {
  return (
    <div className={styles.phoneWrapper}>
      <div className={styles.phoneGlow1} />
      <div className={styles.phoneGlow2} />

      {/* Notification: top-right */}
      <motion.div
        className={`${styles.notifPill} ${styles.notifTopRight}`}
        initial={{ opacity: 0, x: 20, y: -8 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.8, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
      </motion.div>

      {/* Notification: bottom-left */}
      <motion.div
        className={`${styles.notifPill} ${styles.notifBottomLeft}`}
        initial={{ opacity: 0, x: -20, y: 8 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 2.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
      </motion.div>

      {/* Phone */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          rotateZ: 3,
          transformPerspective: 1600,
        }}
        className={styles.phoneOuterRing}
        animate={{
          y: [0, -12, 0],
        }}
        transition={{
          y: {
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        {/*  Status Bar  outside the phone div so it overlays the notch correctly */}
        <div className={styles.statusBar}>
          {/* Time — left of notch */}
          <div className={styles.statusTime}>9:05</div>

          {/* Icons — right of notch */}
          <div className={styles.statusIcons}>
            {/* WiFi */}
            <svg width="14" height="14" viewBox="0 0 15 11" fill="none" style={{ display: 'block' }}>
              <path d="M7.5 8.5C8.05 8.5 8.5 8.95 8.5 9.5C8.5 10.05 8.05 10.5 7.5 10.5C6.95 10.5 6.5 10.05 6.5 9.5C6.5 8.95 6.95 8.5 7.5 8.5Z" fill="white"/>
              <path d="M4.2 6.2C5.1 5.4 6.25 5 7.5 5C8.75 5 9.9 5.4 10.8 6.2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M1.5 3.8C3.1 2.35 5.2 1.5 7.5 1.5C9.8 1.5 11.9 2.35 13.5 3.8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>

            {/* Battery */}
            <svg width="22" height="11" viewBox="0 0 24 12" fill="none" style={{ display: 'block' }}>
              <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke="white" strokeOpacity="0.55"/>
              <rect x="1.5" y="1.5" width="17" height="9" rx="1.5" fill="white"/>
              <path d="M22 4V8C22.8 7.6 23.5 6.85 23.5 6C23.5 5.15 22.8 4.4 22 4Z" fill="white" fillOpacity="0.4"/>
            </svg>
          </div>
        </div>

        <motion.div
          className={styles.phone}
          animate={{
            boxShadow: [
              "0 0 0 8px #0d0d0e, 0 0 0 9.5px rgba(255,255,255,0.05), 0 52px 110px rgba(0,0,0,0.88), 0 0 70px rgba(129,74,200,0.10)",
              "0 0 0 8px #0d0d0e, 0 0 0 9.5px rgba(255,255,255,0.05), 0 64px 130px rgba(0,0,0,0.94), 0 0 90px rgba(129,74,200,0.16)",
              "0 0 0 8px #0d0d0e, 0 0 0 9.5px rgba(255,255,255,0.05), 0 52px 110px rgba(0,0,0,0.88), 0 0 70px rgba(129,74,200,0.10)",
            ],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Dynamic Island */}
          <div className={styles.phoneNotch} />

          <div className={styles.phoneScreen}>
            {/* WA Header */}
            <div className={styles.waHeader}>
              <button className={styles.waBack}>
                <svg width="9" height="16" viewBox="0 0 10 17" fill="none">
                  <path
                    d="M9 1L1.5 8.5L9 16"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className={styles.waAvatar}>
                <span>A</span>
                <span className={styles.waOnlineDot} />
              </div>
 
              <div className={styles.waInfo}>
                <div className={styles.waName}>Amit Sharma</div>
                <div className={styles.waStatus}>online</div>
              </div>

              {/* CHANGED: only video + phone icons, matching reference */}
              <div className={styles.waActions}>
                {/* Video call icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.899L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                    stroke="rgba(255,255,255,0.72)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {/* Phone call icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5 19.79 19.79 0 01.08 2.83 2 2 0 012.07 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                    stroke="rgba(255,255,255,0.72)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Animated chat */}
            <AnimatedChat />

            {/* Input bar */}
            <div className={styles.waInputBar}>
              <div className={styles.waInputField}>
                <span className={styles.waInputPlaceholder}>Message</span>
              </div>
              <div className={styles.waSendBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}