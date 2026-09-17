"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Section.module.css";

// 13 Sequential Steps with Real Skincare Images
const MESSAGES = [
  // 1. Customer initial inquiry
  {
    id: 1,
    side: "right",
    type: "text",
    text: "Hi",
    time: "9:41 AM",
    ticks: true,
  },
  // 2. AI Welcome & Main Menu with Real Photo Skincare Banner
  {
    id: 2,
    side: "left",
    type: "welcome_menu",
    time: "9:41 AM",
  },
  // 3. Customer selects Find the Right Sunscreen
  {
    id: 3,
    side: "right",
    type: "text",
    text: "Find the Right Sunscreen",
    time: "9:41 AM",
    ticks: true,
  },
  // 4. AI Skin Type 2x2 photo selection grid
  {
    id: 4,
    side: "left",
    type: "skin_type",
    time: "9:41 AM",
  },
  // 5. Customer selects Oily skin
  {
    id: 5,
    side: "right",
    type: "text",
    text: "Oily",
    time: "9:41 AM",
    ticks: true,
  },
  // 6. AI Skin Concern selection grid
  {
    id: 6,
    side: "left",
    type: "concern",
    time: "9:41 AM",
  },
  // 7. Customer selects Oil Control
  {
    id: 7,
    side: "right",
    type: "text",
    text: "Oil Control",
    time: "9:41 AM",
    ticks: true,
  },
  // 8. AI Personalized Sunscreen Product Card with real product image
  {
    id: 8,
    side: "left",
    type: "product_card",
    time: "9:41 AM",
  },
  // 9. Customer clicks Add to Cart
  {
    id: 9,
    side: "right",
    type: "text",
    text: "Add to Cart",
    time: "9:41 AM",
    ticks: true,
  },
  // 10. AI Cart summary & Proceed to checkout
  {
    id: 10,
    side: "left",
    type: "cart_summary",
    time: "9:41 AM",
  },
  // 11. Customer proceeds to checkout
  {
    id: 11,
    side: "right",
    type: "text",
    text: "Proceed to Checkout",
    time: "9:41 AM",
    ticks: true,
  },
  // 12. AI Payment method selection
  {
    id: 12,
    side: "left",
    type: "payment_options",
    time: "9:41 AM",
  },
  // 13. Final automated order confirmation
  {
    id: 13,
    side: "left",
    type: "order_success",
    time: "9:42 AM",
  },
];

// Typing durations before each message appears (ms)
const TYPING_DURATIONS = [
  500, // 1. User
  900, // 2. AI Welcome
  400, // 3. User
  800, // 4. AI Skin Type
  400, // 5. User
  800, // 6. AI Concern
  400, // 7. User
  900, // 8. AI Product
  400, // 9. User
  800, // 10. AI Cart
  400, // 11. User
  700, // 12. AI Payment
  850, // 13. AI Order Success
];

// Gap after a message before typing starts for the next (ms)
const GAP_AFTER = [
  350,  // after 1
  800,  // after 2
  350,  // after 3
  800,  // after 4
  350,  // after 5
  800,  // after 6
  350,  // after 7
  900,  // after 8
  350,  // after 9
  800,  // after 10
  350,  // after 11
  700,  // after 12
  4500, // loop restart pause after 13
];

function TypingIndicator() {
  return (
    <motion.div
      className={styles.typing}
      initial={{ opacity: 0, y: 4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -2, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={styles.typingDot}
          animate={{ y: [0, -3.5, 0], opacity: [0.35, 1, 0.35] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.16,
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
      width="14"
      height="9"
      viewBox="0 0 16 11"
      fill="none"
      className={styles.ticks}
    >
      <path
        d="M1 6l3.5 3.5L11.5 2"
        stroke="#53bdeb"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 6l3.5 3.5L15.5 2"
        stroke="#53bdeb"
        strokeWidth="1.7"
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

  useEffect(() => {
    let isCancelled = false;

    function scheduleNext(idx, msgs) {
      if (isCancelled) return;

      if (idx >= MESSAGES.length) {
        timerRef.current = setTimeout(() => {
          if (isCancelled) return;
          setVisibleMessages([]);
          setTypingVisible(false);
          scheduleNext(0, []);
        }, 4500);
        return;
      }

      const delay = idx === 0 ? 450 : GAP_AFTER[idx - 1];

      timerRef.current = setTimeout(() => {
        if (isCancelled) return;
        setTypingVisible(true);
        timerRef.current = setTimeout(() => {
          if (isCancelled) return;
          setTypingVisible(false);
          const newMsgs = [...msgs, MESSAGES[idx]];
          setVisibleMessages(newMsgs);
          scheduleNext(idx + 1, newMsgs);
        }, TYPING_DURATIONS[idx]);
      }, delay);
    }

    scheduleNext(0, []);

    return () => {
      isCancelled = true;
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

      <AnimatePresence initial={false}>
        {visibleMessages.map((msg, i) => (
          <motion.div
            key={`msg-${msg.id || i}`}
            className={`${styles.msgRow} ${
              msg.side === "right" ? styles.msgRight : styles.msgLeft
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {/* 1, 3, 5, 7, 9, 11: Customer Messages */}
            {msg.type === "text" && (
              <div
                className={`${styles.bubble} ${
                  msg.side === "right" ? styles.bubbleRight : styles.bubbleLeft
                }`}
              >
                <span className={styles.bubbleText}>{msg.text}</span>
                <span
                  className={`${styles.msgMeta} ${
                    msg.side === "right" ? styles.msgMetaRight : ""
                  }`}
                >
                  <span className={styles.msgTime}>{msg.time}</span>
                  {msg.ticks && <Ticks />}
                </span>
              </div>
            )}

            {/* 2: Welcome & Main Menu with Real Photo Banner */}
            {msg.type === "welcome_menu" && (
              <div className={styles.waWelcomeCard}>
                {/* Skincare Banner with Real Photo */}
                <div className={styles.bannerHeroPhoto}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/sunglow/banner.jpg"
                    alt="Healthy Skin Brighter Days"
                    className={styles.bannerImg}
                    loading="eager"
                  />
                  <div className={styles.bannerOverlay}>
                    <span className={styles.bannerTag}>✨ Glow Fearlessly</span>
                    <h3 className={styles.bannerTitle}>Healthy Skin Brighter Days</h3>
                    <p className={styles.bannerSub}>Sunscreens • Skincare • Beauty Essentials</p>
                  </div>
                </div>

                {/* Card Body */}
                <div className={styles.waCardBody}>
                  <div className={styles.cardGreeting}>
                    Welcome to <strong>SunGlow!</strong> 💛<br />
                    Your trusted destination for sunscreens and skincare.<br />
                    What would you like to do today?
                  </div>

                  {/* List buttons */}
                  <div className={styles.waActionList}>
                    <div className={`${styles.waListBtn} ${styles.waListBtnSelected}`}>
                      <div className={styles.waBtnLeft}>
                        <span>☀️</span>
                        <span>Find the Right Sunscreen</span>
                      </div>
                      <span className={styles.waBtnArrow}>›</span>
                    </div>

                    <div className={styles.waListBtn}>
                      <div className={styles.waBtnLeft}>
                        <span>🛍️</span>
                        <span>Shop by Category</span>
                      </div>
                      <span className={styles.waBtnArrow}>›</span>
                    </div>

                    <div className={styles.waListBtn}>
                      <div className={styles.waBtnLeft}>
                        <span>📦</span>
                        <span>Track My Order</span>
                      </div>
                      <span className={styles.waBtnArrow}>›</span>
                    </div>

                    <div className={styles.waListBtn}>
                      <div className={styles.waBtnLeft}>
                        <span>🎧</span>
                        <span>Talk to a Skincare Expert</span>
                      </div>
                      <span className={styles.waBtnArrow}>›</span>
                    </div>
                  </div>

                  <span className={styles.msgMeta}>
                    <span className={styles.msgTime}>{msg.time}</span>
                  </span>
                </div>
              </div>
            )}

            {/* 4: Skin Type 2x2 Real Photo Grid */}
            {msg.type === "skin_type" && (
              <div className={styles.waRichCard}>
                <div className={styles.waCardBody}>
                  <div className={styles.cardGreeting}>
                    Great choice! ✨<br />
                    Let&apos;s find the perfect sunscreen for you. <strong>What&apos;s your skin type?</strong>
                  </div>

                  {/* 2x2 Photo Grid */}
                  <div className={styles.skinPhotoGrid}>
                    <div className={styles.skinPhotoTile}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/sunglow/skin-dry.jpg"
                        alt="Dry Skin"
                        className={styles.skinTileImg}
                        loading="eager"
                      />
                      <span className={styles.skinTileLabel}>Dry</span>
                    </div>

                    <div className={`${styles.skinPhotoTile} ${styles.skinPhotoTileSelected}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/sunglow/skin-oily.jpg"
                        alt="Oily Skin"
                        className={styles.skinTileImg}
                        loading="eager"
                      />
                      <span className={styles.skinTileLabel}>Oily</span>
                    </div>

                    <div className={styles.skinPhotoTile}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/sunglow/skin-combination.jpg"
                        alt="Combination Skin"
                        className={styles.skinTileImg}
                        loading="eager"
                      />
                      <span className={styles.skinTileLabel}>Combination</span>
                    </div>

                    <div className={styles.skinPhotoTile}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/sunglow/skin-sensitive.jpg"
                        alt="Sensitive Skin"
                        className={styles.skinTileImg}
                        loading="eager"
                      />
                      <span className={styles.skinTileLabel}>Sensitive</span>
                    </div>
                  </div>

                  <div className={styles.waOutlineActionBtn}>
                    <span>☀️ Not sure? Help me choose</span>
                  </div>

                  <span className={styles.msgMeta}>
                    <span className={styles.msgTime}>{msg.time}</span>
                  </span>
                </div>
              </div>
            )}

            {/* 6: Skin Concern Grid */}
            {msg.type === "concern" && (
              <div className={styles.waRichCard}>
                <div className={styles.waCardBody}>
                  <div className={styles.cardGreeting}>
                    Got it! 👍<br />
                    <strong>What are your main concerns?</strong>
                  </div>

                  {/* 2x3 Concern Grid */}
                  <div className={styles.concernGrid}>
                    <div className={styles.concernChip}>
                      <span className={styles.concernIcon}>☀️</span>
                      <span>Sun Tan</span>
                    </div>

                    <div className={styles.concernChip}>
                      <span className={styles.concernIcon}>🫧</span>
                      <span>Acne Prone</span>
                    </div>

                    <div className={`${styles.concernChip} ${styles.concernChipSelected}`}>
                      <span className={styles.concernIcon}>💧</span>
                      <span>Oil Control</span>
                    </div>

                    <div className={styles.concernChip}>
                      <span className={styles.concernIcon}>⏳</span>
                      <span>Anti-Aging</span>
                    </div>

                    <div className={styles.concernChip}>
                      <span className={styles.concernIcon}>✨</span>
                      <span>Brightening</span>
                    </div>

                    <div className={styles.concernChip}>
                      <span className={styles.concernIcon}>🛡️</span>
                      <span>No White Cast</span>
                    </div>
                  </div>

                  <div className={styles.skipBtnRow}>
                    <span className={styles.skipText}>Skip</span>
                  </div>

                  <span className={styles.msgMeta}>
                    <span className={styles.msgTime}>{msg.time}</span>
                  </span>
                </div>
              </div>
            )}

            {/* 8: Sunscreen Product Recommendation Card with Real Product Image */}
            {msg.type === "product_card" && (
              <div className={styles.waRichCard}>
                <div className={styles.waCardBody}>
                  <div className={styles.cardGreeting}>
                    Here are the best sunscreens for oily skin ☀️<br />
                    <em>Clinically tested, lightweight &amp; non-greasy.</em>
                  </div>

                  {/* Product Card Container */}
                  <div className={styles.productCard}>
                    <div className={styles.productPhotoBox}>
                      <span className={styles.bestsellerBadge}>BESTSELLER</span>
                      <span className={styles.discountBadge}>20% OFF</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/sunglow/sunscreen-matte.jpg"
                        alt="SunGlow Matte Sunscreen Gel"
                        className={styles.productPhotoImg}
                        loading="eager"
                      />
                    </div>

                    <div className={styles.productDetails}>
                      <h4 className={styles.productTitle}>SunGlow Matte Sunscreen Gel</h4>
                      
                      <div className={styles.productPriceRow}>
                        <span className={styles.productPrice}>₹799</span>
                        <span className={styles.productPriceOld}>₹999</span>
                        <span className={styles.productSave}>Save ₹200</span>
                      </div>

                      <p className={styles.productDesc}>
                        Controls oil • No white cast • Lightweight gel finish
                      </p>

                      <div className={styles.productKeyPoints}>
                        <div className={styles.pointItem}>
                          <span className={styles.pointIcon}>🛡️</span>
                          <span>SPF 50 PA++++ Broad Spectrum</span>
                        </div>
                        <div className={styles.pointItem}>
                          <span className={styles.pointIcon}>💧</span>
                          <span>Controls oil for up to 8 hours</span>
                        </div>
                        <div className={styles.pointItem}>
                          <span className={styles.pointIcon}>🧪</span>
                          <span>Dermatologically tested</span>
                        </div>
                      </div>

                      <button type="button" className={styles.btnPrimaryPink}>
                        <span>🛒 Add to Cart</span>
                      </button>

                      <button type="button" className={styles.btnOutlinePink}>
                        <span>See Reviews ⭐ (4.9)</span>
                      </button>
                    </div>
                  </div>

                  <span className={styles.msgMeta}>
                    <span className={styles.msgTime}>{msg.time}</span>
                  </span>
                </div>
              </div>
            )}

            {/* 10: Cart Summary */}
            {msg.type === "cart_summary" && (
              <div className={styles.waRichCard}>
                <div className={styles.waCardBody}>
                  <div className={styles.cardGreeting}>
                    Added to your cart! 🛍️
                  </div>

                  <div className={styles.cartCard}>
                    <div className={styles.cartItemRow}>
                      <div className={styles.cartThumb}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/images/sunglow/sunscreen-thumb.jpg"
                          alt="SunGlow Sunscreen"
                          className={styles.cartThumbImg}
                          loading="eager"
                        />
                      </div>
                      <div className={styles.cartItemInfo}>
                        <div className={styles.cartItemName}>SunGlow Matte Sunscreen Gel</div>
                        <div className={styles.cartItemPrice}>₹799</div>
                      </div>
                      <div className={styles.cartQtyBadge}>1 Qty</div>
                    </div>

                    <div className={styles.cartTotalRow}>
                      <span className={styles.cartTotalLabel}>Total:</span>
                      <span className={styles.cartTotalValue}>₹799</span>
                    </div>

                    <button type="button" className={styles.btnPrimaryPink}>
                      <span>🛍️ Proceed to Checkout</span>
                    </button>

                    <button type="button" className={styles.btnOutlinePink}>
                      <span>Continue Shopping</span>
                    </button>
                  </div>

                  <span className={styles.msgMeta}>
                    <span className={styles.msgTime}>{msg.time}</span>
                  </span>
                </div>
              </div>
            )}

            {/* 12: Payment Options */}
            {msg.type === "payment_options" && (
              <div className={styles.waRichCard}>
                <div className={styles.waCardBody}>
                  <div className={styles.cardGreeting}>
                    You&apos;re almost there! ✨<br />
                    <strong>Choose your payment method:</strong>
                  </div>

                  <div className={styles.paymentRow}>
                    <div className={`${styles.paymentPill} ${styles.paymentPillActive}`}>
                      <span className={styles.paymentIcon}>📱</span>
                      <span className={styles.paymentName}>UPI</span>
                      <span className={styles.paymentSub}>GPay/PhonePe</span>
                    </div>

                    <div className={styles.paymentPill}>
                      <span className={styles.paymentIcon}>💳</span>
                      <span className={styles.paymentName}>Card</span>
                      <span className={styles.paymentSub}>Debit/Credit</span>
                    </div>

                    <div className={styles.paymentPill}>
                      <span className={styles.paymentIcon}>📦</span>
                      <span className={styles.paymentName}>COD</span>
                      <span className={styles.paymentSub}>Pay on delivery</span>
                    </div>
                  </div>

                  <span className={styles.msgMeta}>
                    <span className={styles.msgTime}>{msg.time}</span>
                  </span>
                </div>
              </div>
            )}

            {/* 13: Order Confirmed Message */}
            {msg.type === "order_success" && (
              <div className={styles.waRichCard}>
                <div className={styles.waCardBody}>
                  <div className={styles.orderSuccessHeader}>
                    <span className={styles.orderCheck}>✓</span>
                    <span>Order Placed Successfully! 🎉</span>
                  </div>

                  <div className={styles.orderBadge}>
                    <span>Order #SG45872 • Confirmed</span>
                  </div>

                  <p className={styles.orderSuccessText}>
                    Your <strong>SunGlow Sunscreen</strong> order is confirmed.<br />
                    We&apos;ll send live shipping updates right here on WhatsApp.
                  </p>

                  <div className={styles.orderDeliveryNote}>
                    <span>🚚 Est. Delivery: 2-3 Business Days</span>
                  </div>

                  <button type="button" className={styles.orderTrackBtn}>
                    <span>📍 Track Order Live</span>
                  </button>

                  <span className={styles.msgMeta}>
                    <span className={styles.msgTime}>{msg.time}</span>
                  </span>
                </div>
              </div>
            )}
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
