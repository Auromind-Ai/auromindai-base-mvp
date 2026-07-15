"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Section.module.css";

const MESSAGES = [
  {
    side: "left",
    text: "Hi, I want to buy the Premium plan. How much is the price in INR?",
    time: "10:41",
  },
  {
    side: "right",
    text: "Namaste! The Premium plan is ₹4,999/month. Would you like the secure checkout link to activate it?",
    time: "10:41",
    ticks: true,
  },
  {
    side: "left",
    text: "Yes, please share the link.",
    time: "10:43",
  },
  {
    side: "right",
    text: "Here is your secure Razorpay link to complete the payment: rzp.io/l/orbion-premium",
    time: "10:43",
    ticks: true,
  },
  {
    side: "left",
    text: "Done! payment completed successfully.",
    time: "10:44",
  },
  {
    side: "right",
    text: "Payment of ₹4,999 verified successfully! Your Premium access is now active ✦",
    time: "10:44",
    ticks: true,
  },
];

// How long the typing indicator shows before each message (ms)
const TYPING_DURATIONS = [900, 1050, 900, 900, 850, 1100];

// Gap between finishing one message and starting typing for the next (ms)
const GAP_AFTER = [200, 380, 200, 380, 200, 3200];

function TypingIndicator() {
  return (
    <motion.div
      className={styles.typing}
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.9 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={styles.typingDot}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}

function Ticks() {
  return (
    <svg
      width="15"
      height="10"
      viewBox="0 0 15 10"
      fill="none"
      className={styles.ticks}
    >
      <path
        d="M1 5l3 3 5-7"
        stroke="#53bdeb"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 5l3 3 5-7"
        stroke="#53bdeb"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AnimatedChat() {
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [typingVisible, setTypingVisible] = useState(false);
  const bodyRef = useRef(null);
  const timerRef = useRef(null);

  function scheduleNext(idx, msgs) {
    if (idx >= MESSAGES.length) {
      timerRef.current = setTimeout(() => {
        setVisibleMessages([]);
        setTypingVisible(false);
        scheduleNext(0, []);
      }, 3500);
      return;
    }

    const delay = idx === 0 ? 600 : GAP_AFTER[idx - 1];

    timerRef.current = setTimeout(() => {
      setTypingVisible(true);
      timerRef.current = setTimeout(() => {
        setTypingVisible(false);
        const newMsgs = [...msgs, MESSAGES[idx]];
        setVisibleMessages(newMsgs);
        scheduleNext(idx + 1, newMsgs);
      }, TYPING_DURATIONS[idx]);
    }, delay);
  }

  useEffect(() => {
    scheduleNext(0, []);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [visibleMessages, typingVisible]);

  return (
    <div className={styles.waBody} ref={bodyRef}>
      <div className={styles.waBg} />

      <AnimatePresence>
        {visibleMessages.map((msg, i) => (
          <motion.div
            key={`msg-${i}`}
            className={`${styles.msgRow} ${
              msg.side === "right" ? styles.msgRight : styles.msgLeft
            }`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className={`${styles.bubble} ${
                msg.side === "right" ? styles.bubbleRight : styles.bubbleLeft
              } ${msg.ai ? styles.bubbleAi : ""}`}
            >
              {msg.text}
            </div>
            <div
              className={`${styles.msgMeta} ${
                msg.side === "right" ? styles.msgMetaRight : ""
              }`}
            >
              <span className={styles.msgTime}>{msg.time}</span>
              {msg.ticks && <Ticks />}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {typingVisible && (
          <div className={styles.msgRow}>
            <TypingIndicator />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}