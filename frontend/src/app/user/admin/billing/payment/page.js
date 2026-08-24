"use client";

import { useEffect, useState, Suspense } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle2 } from "lucide-react";

import PricingPage from "@/components/PricingPage";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const LOG_PREFIX = "[BILLING]";
const DEFAULT_PROVIDER = "razorpay";

/* ─ Contact Modal for "Let's Talk" ─ */
function ContactModal({ isOpen, onClose, initialData = {} }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    company: initialData?.company || "",
    requirement: "",
    budget: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || prev.name,
        email: initialData.email || prev.email,
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. API Call to backend
      if (typeof api.submitContactInquiry === 'function') {
        await api.submitContactInquiry(formData);
      } else {
        await api.post('/api/contact/inquiry', formData);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setFormData({ name: "", phone: "", email: "", company: "", requirement: "", budget: "" });
      }, 2000);
    } catch (error) {
      console.error(LOG_PREFIX, "Inquiry submission failed:", error);
      alert("Failed to submit inquiry. Please check your network and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Dialog Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0e0e12] p-6 sm:p-8 shadow-[0_0_50px_rgba(124,58,237,0.25)] z-10"
            style={{ scrollbarWidth: "none" }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10"
            >
              <X size={20} />
            </button>

            {isSuccess ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-4">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
                <p className="text-white/70 text-sm max-w-sm">
                  We have received your requirements and our team will get back to you shortly.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Let’s Talk 🚀
                  </h3>
                  <p className="mt-1 text-sm text-white/60">
                    Tell us what your organization needs and we will prepare a tailored plan.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email & Company */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="jane@company.com"
                        className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Acme Inc."
                        className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                      Estimated Budget
                    </label>
                    <select
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-[#16161d] text-white text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                    >
                      <option value="" disabled>Select a budget tier</option>
                      <option value="Under ₹25,000">Under ₹25,000</option>
                      <option value="₹25,000 - ₹75,000">₹25,000 - ₹75,000</option>
                      <option value="₹75,000 - ₹1,50,000">₹75,000 - ₹1,50,000</option>
                      <option value="₹1,50,000+">₹1,50,000+</option>
                    </select>
                  </div>

                  {/* Requirements */}
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                      Requirements *
                    </label>
                    <textarea
                      name="requirement"
                      rows={3}
                      required
                      value={formData.requirement}
                      onChange={handleChange}
                      placeholder="Share your requirements (integrations, dedicated support, custom quota)..."
                      className="w-full p-3.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors resize-none"
                    />
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 w-full h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9B5DE5] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_25px_rgba(124,58,237,0.35)]"
                  >
                    {isSubmitting ? (
                      <span className="inline-block animate-pulse">Submitting...</span>
                    ) : (
                      <>
                        <span>Submit Details</span>
                        <Send size={16} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// 1. Content component using useSearchParams safely
function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const { workspaceId, user } = useAuth();

  const [currentPlan, setCurrentPlan] = useState("free");
  const [settings, setSettings] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isContactOpen, setIsContactOpen] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      console.error(LOG_PREFIX, "Workspace not found. Please sign in again.");
      return;
    }

    const loadData = async () => {
      try {
        const [billing, settingsData] = await Promise.all([
          api.getBillingStatus(workspaceId),
          api.getPricing(),
        ]);

        setCurrentPlan(billing?.current_plan || "free");
        setSettings(settingsData);
        if (billing?.plans) {
          setPlans(billing.plans);
        }
      } catch (error) {
        console.error(LOG_PREFIX, "Load error:", error);
        setCurrentPlan("free");
      }
    };

    loadData();
  }, [workspaceId]);

  const handleUpgrade = async (planKey, billingCycle = "monthly") => {
    // Intercept Enterprise / Custom / Let's Talk button clicks
    if (planKey === "enterprise" || planKey === "custom" || planKey === "letstalk") {
      setIsContactOpen(true);
      return;
    }

    if (!workspaceId || !["solo", "pro"].includes(planKey)) return;

    try {
      const checkout = await api.createBillingSubscription(
        workspaceId,
        planKey,
        billingCycle,
        DEFAULT_PROVIDER
      );

      await api.openRazorpayCheckout({
        orderData: checkout,
        name: "Auromind",
        description: `${checkout.plan_label || "Pro"} subscription`,
        prefill: checkout.prefill,
        handler: async (response) => {
          const payload = {
            workspace_id: workspaceId,
            plan: planKey,
            billing_cycle: billingCycle,
            provider: checkout.provider,
            payment_id: response.razorpay_payment_id,
            subscription_id: response.razorpay_subscription_id || checkout.subscription_id,
            signature: response.razorpay_signature,
          };
          try {
            const result = await api.verifyBillingPayment(payload);

            if (!result || (result.status !== "ACTIVE" && result.status !== "already_verified")) {
              throw new Error("Payment not activated");
            }

            if (source === "chat") {
              router.push("/user/admin/ai");
            } else {
              const updated = await api.getBillingStatus(workspaceId);
              setCurrentPlan(updated.current_plan);
            }
          } catch (error) {
            console.error(LOG_PREFIX, "Payment verification failed:", error);
          }
        },
      });
    } catch (error) {
      console.error(LOG_PREFIX, "Unable to start upgrade:", error);
    }
  };

  return (
    <>
      <PricingPage
        currentPlan={currentPlan}
        onUpgrade={handleUpgrade}
        settings={settings}
        dbPlans={plans}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        initialData={{
          name: user?.name || "",
          email: user?.email || "",
        }}
      />
    </>
  );
}

// 2. Main Page export wrapped in Suspense
export default function BillingPage() {
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-gray-500">
            Loading Billing...
          </div>
        }
      >
        <BillingContent />
      </Suspense>
    </>
  );
}