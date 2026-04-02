"use client"

import { useEffect, useState } from "react"
import Script from "next/script"

import PricingPage from "@/components/PricingPage"
import api from "@/lib/api"
import { getWorkspaceIdFromToken } from "@/lib/auth"

const LOG_PREFIX = "[BILLING]"
const FLOW_LOG_PREFIX = "[BILLING FLOW]"
const DEFAULT_PROVIDER = "razorpay"

export default function BillingPage() {
  const [workspaceId, setWorkspaceId] = useState(null)
  const [currentPlan, setCurrentPlan] = useState("free")
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    const id = getWorkspaceIdFromToken() || sessionStorage.getItem("workspace_id")

    console.log(LOG_PREFIX, "Workspace detected:", id)
    setWorkspaceId(id)

    if (!id) {
      console.error(LOG_PREFIX, "Workspace not found. Please sign in again.")
      return
    }

    const loadData = async () => {
      try {
        //  BOTH CALLS
        const [billing, settingsData] = await Promise.all([
          api.getBillingStatus(id),
          api.getPlatformSettings(), 
        ])

        console.log(LOG_PREFIX, "Billing:", billing)
        console.log(LOG_PREFIX, "Settings:", settingsData)

        setCurrentPlan(billing?.current_plan || "free")
        setSettings(settingsData)
      } catch (error) {
        console.error(LOG_PREFIX, "Load error:", error)
        setCurrentPlan("free")
      }
    }

    loadData()
  }, [])

  const logBillingFlow = (step, data) => {
    console.log(FLOW_LOG_PREFIX, step, data)
  }

  const handleUpgrade = async (planKey) => {
    if (!workspaceId || planKey !== "pro") return

    logBillingFlow("upgrade_initiated", {
      workspaceId,
      planKey,
      provider: DEFAULT_PROVIDER,
    })

    try {
      const checkout = await api.createBillingSubscription(
        workspaceId,
        planKey,
        DEFAULT_PROVIDER
      )

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is still loading.")
      }

      const razorpay = new window.Razorpay({
        key: checkout.public_key,
        subscription_id: checkout.subscription_id,
        name: "Auromind",
        description: `${checkout.plan_label || "Pro"} subscription`,
        prefill: checkout.prefill,

        handler: async (response) => {
          const payload = {
            workspace_id: workspaceId,
            plan: planKey,
            provider: checkout.provider,
            payment_id: response.razorpay_payment_id,
            subscription_id: response.razorpay_subscription_id || checkout.subscription_id,
            signature: response.razorpay_signature,
          }
          console.log("PAYLOAD GOING TO BACKEND:", payload); // <-- Idha check pannu
          try {
           const result = await api.verifyBillingPayment(payload)

            console.log("VERIFY RESULT:", result)

  
            if (!result || (result.status !== "ACTIVE" && result.status !== "already_verified")) {
              throw new Error("Payment not activated")
            }

            const updated = await api.getBillingStatus(workspaceId)

            setCurrentPlan(updated.current_plan)
          } catch (error) {
            console.error(LOG_PREFIX, "Payment verification failed:", error)
          }
        },
      })

      razorpay.open()
    } catch (error) {
      console.error(LOG_PREFIX, "Unable to start upgrade:", error)
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <PricingPage
        currentPlan={currentPlan}
        onUpgrade={handleUpgrade}
        settings={settings} 
      />
    </>
  )
}