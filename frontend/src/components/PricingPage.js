"use client"

import { ArrowRight, Check, ChevronRight } from "lucide-react"

const PLAN_ORDER = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

function PricingCard({ plan, currentPlan, onUpgrade }) {
  const isCurrent = currentPlan === plan.key
  const isEnterprise = plan.key === "enterprise"

  const currentRank = PLAN_ORDER[currentPlan] ?? 0
  const planRank = PLAN_ORDER[plan.key] ?? 0
  const shouldShowActionButton = planRank >= currentRank

  const handleClick = () => {
    if (isCurrent || isEnterprise || typeof onUpgrade !== "function") return
    onUpgrade(plan.key)
  }

  const getCTA = (planKey) => {
    if (currentPlan === planKey) return "Current Plan"
    if (planKey === "pro") return "Upgrade to Pro"
    return "Contact Sales"
  }

  return (
    <article
      className={[
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 md:p-7",
        "bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.98))] backdrop-blur-xl",
        plan.featured
          ? "border-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_24px_80px_rgba(8,145,178,0.18)]"
          : "border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.32)]",
        isCurrent
          ? "border-emerald-400/50 shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_0_40px_rgba(16,185,129,0.18)]"
          : "hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_80px_rgba(0,0,0,0.4)]",
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)] opacity-70" />
      <div
        className={[
          "absolute inset-0 opacity-80",
          plan.featured
            ? "bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_38%)]"
            : isCurrent
              ? "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_38%)]"
              : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_36%)]",
        ].join(" ")}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex min-h-14 items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
                {plan.name}
              </span>

              {plan.featured && !isCurrent && !isEnterprise && (
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-100">
                  Most Popular
                </span>
              )}

              {isCurrent && (
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                  Current Plan
                </span>
              )}
            </div>

            <p className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {plan.price}
            </p>

            <p className="mt-3 max-w-xs text-sm leading-6 text-zinc-400">
              {plan.description}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Usage</p>
          <p className="mt-3 text-lg font-medium text-zinc-100">{plan.usage}</p>
        </div>

        <ul className="mt-6 space-y-3 text-sm text-zinc-300">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <Check size={12} />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {shouldShowActionButton && (
          <button
            type="button"
            onClick={handleClick}
            disabled={isCurrent || isEnterprise}
            className={[
              "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
              isCurrent
                ? "cursor-not-allowed border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : isEnterprise
                  ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-zinc-400"
                  : plan.featured
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.1]",
            ].join(" ")}
          >
            <span>{getCTA(plan.key)}</span>
            {!isCurrent && !isEnterprise && <ArrowRight size={16} />}
            {isEnterprise && <ChevronRight size={16} />}
          </button>
        )}
      </div>
    </article>
  )
}
const TOKENS_PER_CREDIT = 1000;
export default function PricingPage({ currentPlan = "free", onUpgrade, settings }) {
  if (!settings) {
    return (
      <section className="min-h-screen bg-[#09090b] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.94),rgba(9,9,11,0.98))] px-6 py-12 text-center">
            Loading...
          </div>
        </div>
      </section>
    )
  }

  const plans = [
    {
      key: "free",
      name: settings.free_plan_name || "Free",
      price: settings.free_plan_price === 0 ? "Free" : `₹${settings.free_plan_price}`,
      usage: `${Math.round((settings.token_limit_per_plan?.free || 0) / TOKENS_PER_CREDIT)} credits / month`,
      description:
        settings.free_plan_desc ||
        "A clean starting point for individual builders exploring the platform.",
      features: settings.free_plan_features || [
        "100 monthly AI credits",
        "Core workspace access",
        "Basic automations",
        "Community support",
      ],
    },
    {
      key: "pro",
      name: settings.pro_plan_name || "Pro",
      price: `₹${settings.pro_plan_price || 999}`,
      usage: `${Math.round((settings.token_limit_per_plan?.pro || 0) / TOKENS_PER_CREDIT)} credits / month`,
      description:
        settings.pro_plan_desc ||
        "For teams running daily AI workflows and needing faster execution.",
      featured: true,
      features: settings.pro_plan_features || [
        "1,000 monthly AI credits",
        "Priority model access",
        "Advanced workflow automations",
        "Team collaboration tools",
        "Priority email support",
      ],
    },
    {
      key: "enterprise",
      name: settings.enterprise_plan_name || "Enterprise",
      usage: "Custom credits and seats",
      description:
        settings.enterprise_plan_desc ||
        "Tailored capacity, security, and support for larger organizations.",
      features: settings.enterprise_plan_features || [
        "Custom usage limits",
        "Dedicated onboarding",
        "SSO and advanced controls",
        "Custom SLA and support",
        "Procurement-ready billing",
      ],
    },
  ]

  return (
    <section className="min-h-screen bg-[#09090b] px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_24%),linear-gradient(180deg,rgba(24,24,27,0.94),rgba(9,9,11,0.98))] px-6 py-12 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:px-8 lg:px-12 lg:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.04),transparent_28%)]" />

          <div className="relative mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
              Pricing
            </span>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
              “Flexible pricing for powerful AI automation”
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-xs leading-5 text-zinc-400 sm:text-sm">
              Start free, upgrade when your workflows scale, and move to enterprise controls when procurement and security matter.
            </p>
          </div>

          <div className="relative mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <PricingCard
                key={plan.key}
                plan={plan}
                currentPlan={currentPlan}
                onUpgrade={onUpgrade}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}