"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import {
  CheckCheck,
  CheckCircle2,
  Droplet,
  Hourglass,
  Leaf,
  Minus,
  Plus,
  ShoppingCart,
  Smile,
  Sparkles,
  Star,
  Sun,
  Trash2
} from "lucide-react";

// Exact timings as requested: User ~600ms, AI ~1200ms
const TIMELINE = [
  // 1. Welcome
  { type: "user", text: "Hi", delay: 600 },
  { type: "ai", component: "welcome", delay: 1200 },

  // 2. Skin Types
  { type: "user", text: "Find the Right Sunscreen", delay: 600 },
  { type: "ai", component: "skin_types", delay: 1200 },

  // 3. Concerns
  { type: "user", text: "Oily", delay: 600 },
  { type: "ai", component: "concerns", delay: 1200 },

  // 4. Products
  { type: "user", text: "Oil Control", delay: 600 },
  { type: "ai", component: "products", delay: 1200 },

  // 5. Product Detail
  { type: "user", text: "View Product", delay: 600 },
  { type: "ai", component: "product_detail", delay: 1200 },

  // 6. Cart
  { type: "user", text: "Add to Cart", delay: 600 },
  { type: "ai", component: "cart", delay: 1200 },

  // 7. Payment & Confirmation
  { type: "user", text: "Proceed to Checkout", delay: 600 },
  { type: "ai", component: "payment", delay: 1200 },
  { type: "user", text: "UPI", delay: 600 },
  { type: "ai", component: "confirmation", delay: 4500 }, // pause before loop restart
];

function ReplyArrowIcon({ size = 12, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 14L4 9M4 9L9 4M4 9H15C18.3137 9 21 11.6863 21 15V17"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// WhatsApp Official Interactive Card Layout with Attached Buttons & Dividers
function WhatsAppCard({ children, buttons = [], time = "9:41 AM" }) {
  return (
    <div className="rounded-2xl rounded-tl-xs bg-white shadow-xs border border-slate-200/80 max-w-[95%] overflow-hidden">
      <div className="p-3 pb-2 text-[11px] text-slate-800 leading-relaxed relative">
        {children}
        <div className="mt-1 text-right text-[8px] text-slate-400 font-sans">{time}</div>
      </div>

      {buttons.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-100 bg-white">
          {buttons.map((btn, idx) => (
            <div
              key={idx}
              className="flex min-h-[34px] w-full items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#075e54] hover:bg-slate-50 transition-colors"
            >
              <ReplyArrowIcon size={12} className="text-[#075e54] shrink-0" />
              <span>{btn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 1. Welcome Card
function WelcomeCard() {
  return (
    <WhatsAppCard
      buttons={[
        "Find the Right Sunscreen",
        "Shop by Category",
        "Track My Order",
        "Talk to a Skincare Expert",
      ]}
    >
      <div className="relative overflow-hidden rounded-xl bg-slate-100 mb-2 aspect-[950/450]">
        <img
          src="/images/sunglow/sunscreen-banner.png"
          alt="Healthy Skin Brighter Days"
          className="w-full h-full object-cover"
        />
      </div>
      <p>
        <strong>Welcome to SunGlow! 💛</strong><br />
        Your trusted destination for sunscreens and skincare.<br />
        What would you like to do today?
      </p>
    </WhatsAppCard>
  );
}

// 2. Skin Types Card (Using exact uploaded 4-skin photo grid)
function SkinTypesCard() {
  return (
    <WhatsAppCard buttons={["Not sure? Help me choose"]}>
      <p className="mb-2">
        <strong>Great choice! ✨</strong><br />
        Let&apos;s find the perfect sunscreen for you. What&apos;s your skin type?
      </p>
      <div className="relative overflow-hidden rounded-xl bg-slate-100 border border-slate-100">
        <img
          src="/images/sunglow/skin-types-grid.jpg"
          alt="Skin Types: Dry, Oily, Combination, Sensitive"
          className="w-full h-auto object-contain rounded-xl"
        />
      </div>
    </WhatsAppCard>
  );
}

// 3. Concerns Card
function ConcernsCard() {
  return (
    <WhatsAppCard
      buttons={[
        "Sun Tan",
        "Acne Prone Skin",
        "Oil Control",
        "Anti-Aging",
        "Brightening",
        "No White Cast",
        "Skip",
      ]}
    >
      <p>
        Got it! 👍<br />
        What are your main concerns?
      </p>
    </WhatsAppCard>
  );
}

// 4. Products Card
function ProductsCard() {
  return (
    <WhatsAppCard buttons={["View Product"]}>
      <p className="mb-2">
        Here are the best sunscreens for oily skin ☀️<br />
        Clinically tested, lightweight &amp; non-greasy.
      </p>

      <div className="grid grid-cols-2 gap-1.5 mb-1">
        {/* Product 1 */}
        <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-slate-50/50 p-1.5 relative">
          <span className="absolute top-2 left-2 rounded bg-amber-500 px-1 py-0.5 text-[7px] font-extrabold text-white z-10">
            BESTSELLER
          </span>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white mb-1.5">
            <img
              src="/images/sunglow/sunscreen-matte.jpg"
              alt="SunGlow Matte Sunscreen Gel"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div>
            <strong className="block text-[10px] font-bold text-slate-900 leading-tight">
              SunGlow Matte Sunscreen Gel
            </strong>
            <p className="text-[8px] text-slate-500 my-1 leading-tight">
              Controls oil · No white cast · Lightweight
            </p>
            <div className="text-[10px] font-extrabold text-slate-900">
              ₹799 <del className="text-[8px] font-normal text-slate-400">₹999</del>
            </div>
          </div>
        </div>

        {/* Product 2 */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-1.5">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white mb-1.5">
            <img
              src="/images/sunglow/sunscreen-aqua.jpg"
              alt="SunGlow Aqua Fluid Sunscreen"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div>
            <strong className="block text-[10px] font-bold text-slate-900 leading-tight">
              SunGlow Aqua Fluid Sunscreen
            </strong>
            <p className="text-[8px] text-slate-500 my-1 leading-tight">
              Ultra-light · Quick absorbing · For oily skin
            </p>
            <div className="text-[10px] font-extrabold text-slate-900">₹899</div>
          </div>
        </div>
      </div>
    </WhatsAppCard>
  );
}

// 5. Product Detail Card
function ProductDetailCard() {
  return (
    <WhatsAppCard buttons={["Add to Cart", "See Reviews ⭐"]}>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-50 mb-2">
        <img
          src="/images/sunglow/sunscreen-matte.jpg"
          alt="SunGlow Matte Sunscreen Gel Detail"
          className="w-full h-full object-contain p-2"
        />
      </div>

      <h3 className="text-xs font-bold text-slate-900">SunGlow Matte Sunscreen Gel</h3>
      <div className="my-1.5 flex items-center gap-2">
        <strong className="text-sm font-extrabold text-slate-900">₹799</strong>
        <del className="text-xs text-slate-400">₹999</del>
        <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700">20% OFF</span>
      </div>

      <p className="text-[10px] text-slate-600 mb-2">
        Perfect for oily &amp; acne-prone skin. Matte finish, no white cast, lightweight.
      </p>

      <ul className="my-2 space-y-1 text-[9px] text-slate-700">
        {[
          "SPF 50 PA++++",
          "Controls oil for up to 8 hours",
          "Dermatologically tested",
          "Suitable for daily use",
        ].map((text) => (
          <li key={text} className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="shrink-0 text-[#075e54]" />
            {text}
          </li>
        ))}
      </ul>
    </WhatsAppCard>
  );
}

// 6. Cart Card
function CartCard() {
  return (
    <WhatsAppCard buttons={["Proceed to Checkout", "Continue Shopping"]}>
      <p className="text-[11px] font-semibold text-slate-800 mb-2">Added to your cart! 🎁</p>

      <div className="flex items-center gap-2 border-y border-slate-100 py-2">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-50 border border-slate-100">
          <img
            src="/images/sunglow/sunscreen-thumb.jpg"
            alt="SunGlow Matte Gel"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block text-[9px] font-bold text-slate-900 leading-tight">
            SunGlow Matte Sunscreen Gel
          </strong>
          <span className="text-[10px] font-bold text-slate-900 mt-0.5 block">₹799</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 text-[9px]">
          <Minus size={10} className="text-slate-500" />
          <span className="font-bold text-slate-800">1</span>
          <Plus size={10} className="text-slate-500" />
          <Trash2 size={10} className="text-rose-500 ml-1" />
        </div>
      </div>

      <div className="mt-2 flex justify-between text-xs font-bold text-slate-900">
        <span>Total</span>
        <span>₹799</span>
      </div>
    </WhatsAppCard>
  );
}

// 7. Payment Options Card
function PaymentCard() {
  return (
    <WhatsAppCard buttons={["UPI", "Card", "COD"]}>
      <p className="font-medium">Choose a payment method:</p>
    </WhatsAppCard>
  );
}

// 8. Order Confirmation Card
function ConfirmationCard() {
  return (
    <WhatsAppCard>
      <div className="flex items-center gap-1.5 text-amber-500 mb-1">
        <span className="text-sm">🎉</span>
        <strong className="text-[11px] font-bold text-slate-900">Order Placed Successfully!</strong>
      </div>
      <p className="text-[10px] text-slate-600 leading-relaxed">
        Your order <strong>#SG45872</strong> is confirmed.<br />
        You&apos;ll receive a confirmation email shortly.<br />
        Thank you for choosing SunGlow! 💛
      </p>
    </WhatsAppCard>
  );
}

export function AnimatedChat() {
  const viewportRef = useRef(null);
  const scrollRef = useRef(null);
  const inView = useInView(viewportRef, { amount: 0.25 });
  const reducedMotion = useReducedMotion();
  const [pageVisible, setPageVisible] = useState(true);

  // Index of timeline events currently added to chat history
  const [stepIndex, setStepIndex] = useState(0);

  const running = inView && pageVisible && !reducedMotion;

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // Continuous loop through TIMELINE
  useEffect(() => {
    if (!running) return;

    const currentStep = TIMELINE[stepIndex];
    const timer = setTimeout(() => {
      if (stepIndex < TIMELINE.length - 1) {
        setStepIndex((prev) => prev + 1);
      } else {
        // Restart flow from beginning
        setStepIndex(0);
      }
    }, currentStep.delay);

    return () => clearTimeout(timer);
  }, [running, stepIndex]);

  // Smooth scroll to bottom as conversation grows
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }, [stepIndex, reducedMotion]);

  // Active items up to current stepIndex
  const activeItems = TIMELINE.slice(0, stepIndex + 1);

  return (
    <div ref={viewportRef} className="flex min-h-0 flex-1 flex-col bg-[#efeae2] text-[#111b21] [font-family:Arial,sans-serif]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Subtle WhatsApp Chat Pattern Background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[url('/images/WABackGround.webp')] bg-[length:260px_auto] opacity-[0.06]"
        />

        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto overscroll-contain p-2.5 text-[11px] leading-[1.4] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-2.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <AnimatePresence initial={false}>
            {activeItems.map((item, idx) => {
              if (item.type === "user") {
                return (
                  <motion.div
                    key={`user_${idx}`}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex justify-end"
                  >
                    <div className="flex max-w-[85%] flex-wrap items-end justify-end gap-x-2 rounded-2xl rounded-tr-xs bg-[#d9fdd3] px-3 py-1.5 shadow-xs border border-emerald-100">
                      <span className="text-[11px] font-medium text-slate-900 leading-snug">{item.text}</span>
                      <span className="flex items-center gap-1 text-[8px] text-slate-500 shrink-0">
                        9:41 AM <CheckCheck size={13} className="text-[#34B7F1]" />
                      </span>
                    </div>
                  </motion.div>
                );
              }

              if (item.type === "ai") {
                return (
                  <motion.div
                    key={`ai_${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex justify-start"
                  >
                    {item.component === "welcome" && <WelcomeCard />}
                    {item.component === "skin_types" && <SkinTypesCard />}
                    {item.component === "concerns" && <ConcernsCard />}
                    {item.component === "products" && <ProductsCard />}
                    {item.component === "product_detail" && <ProductDetailCard />}
                    {item.component === "cart" && <CartCard />}
                    {item.component === "payment" && <PaymentCard />}
                    {item.component === "confirmation" && <ConfirmationCard />}
                  </motion.div>
                );
              }

              return null;
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
