"use client"

import { useEffect, useState, Suspense } from "react"
import Script from "next/script"
import { useRouter, useSearchParams } from "next/navigation"

import PricingPage from "@/components/PricingPage"
import PaymentSummaryModal from "@/components/billing/PaymentSummaryModal"
import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

const LOG_PREFIX = "[BILLING]"
const DEFAULT_PROVIDER = "razorpay"

function BillingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const source = searchParams.get('source')
  const { workspaceId } = useAuth()

  const [currentPlan, setCurrentPlan] = useState("free")
  const [settings, setSettings] = useState(null)
  const [plans, setPlans] = useState([])

  // Modal State
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  useEffect(() => {
    if (!workspaceId) {
      console.error(LOG_PREFIX, "Workspace not found. Please sign in again.")
      return
    }

    const loadData = async () => {
      try {
        const [billing, settingsData] = await Promise.all([
          api.getBillingStatus(workspaceId),
          api.getPricing(), 
        ])

        setCurrentPlan(billing?.current_plan || "free")
        setSettings(settingsData)
        if (billing?.plans) {
          setPlans(billing.plans)
        }
      } catch (error) {
        console.error(LOG_PREFIX, "Load error:", error)
        setCurrentPlan("free")
      }
    }

    loadData()
  }, [workspaceId])

  // Step 1: Open Payment Summary Breakdown Modal
  const handleUpgradeClick = (planKey, billingCycle = "monthly") => {
    if (!workspaceId || !["solo", "pro"].includes(planKey)) return

    const isPro = planKey === "pro"
    const basePrice = isPro ? 199 : 999

    setSelectedPlanDetails({
      title: isPro ? "Pro Plan Subscription" : "Solo Smart Subscription",
      subtitle: "Workspace Plan Upgrade",
      planKey,
      billingCycle,
      baseAmount: basePrice,
      currency: "INR",
      features: isPro ? [
        "250,000 AI Credits / month",
        "500 WhatsApp WCC Wallet Credits",
        "Unlimited Agent Automation Flows",
        "5 Team Member Seats",
        "24/7 Priority Support"
      ] : [
        "15,000 AI Credits / month",
        "Custom Knowledge Base",
        "1 Gmail Integration"
      ]
    })

    setIsSummaryModalOpen(true)
  }

  // Step 2: Confirm and Proceed to Razorpay Checkout Gateway
  const handleConfirmPay = async () => {
    if (!selectedPlanDetails || !workspaceId) return

    setIsProcessingPayment(true)
    const { planKey, billingCycle } = selectedPlanDetails

    try {
      const checkout = await api.createBillingSubscription(
        workspaceId,
        planKey,
        billingCycle,
        DEFAULT_PROVIDER
      )

      setIsSummaryModalOpen(false)
      setIsProcessingPayment(false)

      await api.openRazorpayCheckout({
        orderData: checkout,
        name: "Auromind AI",
        description: `${checkout.plan_label || "Pro"} Subscription Upgrade`,
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
          }
          try {
            const result = await api.verifyBillingPayment(payload)

            if (!result || (result.status !== "ACTIVE" && result.status !== "already_verified")) {
              throw new Error("Payment not activated")
            }

            if (source === 'chat') {
              router.push('/user/admin/ai')  
            } else {
              const updated = await api.getBillingStatus(workspaceId)
              setCurrentPlan(updated.current_plan)
            }
          } catch (error) {
            console.error(LOG_PREFIX, "Payment verification failed:", error)
          }
        }
      })
    } catch (error) {
      console.error(LOG_PREFIX, "Unable to start upgrade:", error)
      setIsProcessingPayment(false)
    }
  }

  return (
    <>
      <PricingPage
        currentPlan={currentPlan}
        onUpgrade={handleUpgradeClick}
        settings={settings} 
        dbPlans={plans}
      />

      <PaymentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        itemDetails={selectedPlanDetails}
        onProceedToPay={handleConfirmPay}
        isProcessing={isProcessingPayment}
      />
    </>
  )
}

export default function BillingPage() {
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading Billing...</div>}>
        <BillingContent />
      </Suspense>
    </>
  )
}
