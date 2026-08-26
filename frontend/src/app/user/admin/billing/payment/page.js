"use client"

import { useEffect, useState, Suspense } from "react"
import Script from "next/script"
import { useRouter, useSearchParams } from "next/navigation"

import PricingPage from "@/components/PricingPage"
import PaymentSummaryModal from "@/components/billing/PaymentSummaryModal"
import PaymentSuccessModal from "@/components/billing/PaymentSuccessModal"
import PaymentFailedModal from "@/components/billing/PaymentFailedModal"
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

  // Success Modal State
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [successDetails, setSuccessDetails] = useState(null)

  // Failed Modal State
  const [isFailedModalOpen, setIsFailedModalOpen] = useState(false)
  const [failedDetails, setFailedDetails] = useState(null)

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
      const res = await api.initiatePlanPurchase(
        workspaceId,
        planKey,
        billingCycle,
        DEFAULT_PROVIDER
      )
      const orderData = res.data ?? res

      setIsSummaryModalOpen(false)
      setIsProcessingPayment(false)

      await api.openRazorpayCheckout({
        orderData,
        workspaceId,
        name: "Auromind",
        description: `${orderData.plan_label || "Pro"} Plan`,
        prefill: orderData.prefill,
        handler: async (response) => {
          const payload = {
            workspace_id: workspaceId,
            plan: planKey,
            billing_cycle: billingCycle,
            provider: orderData.provider,
            razorpay_order_id: response.razorpay_order_id || orderData.gateway_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }
          try {
            const result = await api.verifyPlanPayment(payload)

            if (!result || (result.status !== "ACTIVE" && result.status !== "already_verified")) {
              throw new Error("Payment not activated")
            }

            //  THE MAGIC LOGIC: Chat-la irunthu vantha, angae return anuppu!
            if (source === 'chat') {
              router.push('/user/admin/ai')  
            } else {
              const updated = await api.getBillingStatus(workspaceId)
              setCurrentPlan(updated.current_plan)
            }
          } catch (error) {
            console.error(LOG_PREFIX, "Payment verification failed:", error)
            setFailedDetails({
              errorMessage: "Payment verification failed. Your account was not charged.",
              reason: error?.message || "Signature or activation failed",
            })
            setIsFailedModalOpen(true)
          }
        },
        ondismiss: () => {
          setFailedDetails({
            errorMessage: "The checkout process was closed before completion.",
            reason: "Checkout window dismissed by user",
          })
          setIsFailedModalOpen(true)
        }
      })
    } catch (error) {
      console.error(LOG_PREFIX, "Unable to start upgrade:", error)
      setIsProcessingPayment(false)
      setFailedDetails({
        errorMessage: "Unable to initiate payment checkout.",
        reason: error?.message || "Network or subscription initialization error",
      })
      setIsFailedModalOpen(true)
    }
  }

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false)
    if (source === 'chat') {
      router.push('/user/admin/ai')
    }
  }

  const handleGoToDashboard = () => {
    setIsSuccessModalOpen(false)
    if (source === 'chat') {
      router.push('/user/admin/ai')
    } else {
      router.push('/user/admin/dashboard')
    }
  }

  const handleRetryPayment = () => {
    setIsFailedModalOpen(false)
    if (selectedPlanDetails) {
      setIsSummaryModalOpen(true)
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

      <PaymentSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={handleCloseSuccessModal}
        paymentDetails={successDetails}
        onGoToDashboard={handleGoToDashboard}
      />

      <PaymentFailedModal
        isOpen={isFailedModalOpen}
        onClose={() => setIsFailedModalOpen(false)}
        failureDetails={failedDetails}
        onRetryPayment={handleRetryPayment}
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
