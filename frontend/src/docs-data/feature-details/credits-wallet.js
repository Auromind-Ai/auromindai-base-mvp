const walletVariants = {
  "ai": {
    "tagline": "Track your AI usage, understand your remaining credits, and top up when needed.",
    "description": "AI Workspace Credits power AI chat, Inbox reply suggestions, Brain content processing and knowledge-based answers, flow generation, and template generation. This wallet shows your available credits and usage. WhatsApp messaging charges use a separate WCC wallet.",
    "copy": {
      "benefitsIntro": "Know how much AI capacity you have and plan when to add more.",
      "troubleshootingTitle": "AI Credit Questions",
      "troubleshootingIntro": "Balance, access, and purchases.",
      "answerLabel": "Answer:"
    },
    "screenshots": {
      "benefits": {
        "src": "/images/doc-images/ai-credit-balance-recharge.png",
        "alt": "AI credit balance, usage metrics, credit-used bar and selectable recharge packs",
        "label": "AI credit balance & recharge packs",
        "caption": "Illustrative screenshot. Amounts and available options depend on your workspace.",
        "aspectRatio": "aspect-[1655/952] [&_img]:object-contain"
      }
    },
    "benefits": [
      {
        "title": "Keep Your AI Features Running",
        "description": "Check your balance before using AI chat, processing documents, or generating content so you can plan a top-up."
      },
      {
        "title": "Understand Your Usage",
        "description": "Compare today's use with your monthly cycle to see how quickly your workspace is using credits."
      },
      {
        "title": "Choose a Suitable Credit Pack",
        "description": "Compare available packs and add the amount of AI credits your workspace needs."
      },
      {
        "title": "Plan Ahead",
        "description": "Use the remaining balance, usage bar, and runway estimate to decide when to recharge."
      }
    ],
    "featureGuides": [
      {
        "title": "How to Recharge AI Credits",
        "layout": "alternating",
        "description": "Use the AI Workspace Credits tab in Credits & Wallet.",
        "items": [
          {
            "title": "1. Check your balance",
            "description": "Review the available credits and current usage. Choose Recharge Wallet to move to the available packs.",
            "screenshot": {
              "src": "/images/doc-images/ai-credit-wallet-balance.png",
              "alt": "AI wallet balance, usage, runway and Recharge Wallet button",
              "aspectRatio": "aspect-[8/5] [&_img]:object-contain [&_img]:!scale-100",
              "caption": "Illustrative screenshot. Click to expand."
            }
          },
          {
            "title": "2. Select a pack",
            "description": "Compare the price and credit amount. The selected option is highlighted.",
            "screenshot": {
              "src": "/images/doc-images/ai-credit-pack-selection.png",
              "alt": "AI credit packs with the Starter Pack selected and Purchase selected pack button",
              "aspectRatio": "aspect-[8/5] [&_img]:object-contain [&_img]:!scale-100",
              "caption": "Illustrative screenshot. Click to expand."
            }
          },
          {
            "title": "3. Review and pay",
            "description": "Choose Purchase selected pack. Check the price summary, select an available payment method, and complete checkout.",
            "screenshot": {
              "src": "/images/doc-images/ai-credit-payment-checkout.png",
              "alt": "Payment checkout showing price summary and available payment methods",
              "aspectRatio": "aspect-[8/5] [&_img]:object-contain [&_img]:!scale-100",
              "caption": "Example checkout preview. Use the checkout opened from your wallet to pay."
            }
          },
          {
            "title": "4. Confirm the update",
            "description": "Wait for Payment Successful, then return to your wallet. Check the updated balance and the matching credit addition in Activity.",
            "screenshot": {
              "src": "/images/doc-images/ai-credit-payment-success-activity.png",
              "alt": "Successful AI credit payment and the matching credit addition in Activity",
              "aspectRatio": "aspect-[8/5] [&_img]:object-contain [&_img]:!scale-100",
              "caption": "Illustrative screenshot. Click to expand."
            }
          }
        ]
      },
      {
        "title": "Follow Your Monthly Usage",
        "description": "The rest of the AI overview helps you understand how credits are added and used.",
        "items": [
          {
            "title": "Monthly Cycle",
            "description": "Included Remaining is the unused credit allowance from your plan. Purchased Remaining is unused top-up credits. Used This Cycle shows monthly use, Avg. Daily Burn shows average daily use, and Cycle resets shows when the next cycle starts.",
            "screenshot": {
              "src": "/images/doc-images/ai-credits-monthly-cycle.png",
              "alt": "Monthly Cycle showing remaining plan and purchased credits, cycle usage, average daily use and reset date",
              "aspectRatio": "h-[200px] sm:h-[240px] [&_img]:object-contain [&_img]:!scale-100",
              "caption": "Illustrative screenshot. Click to expand.",
              "className": "w-full max-w-[560px] mx-auto"
            }
          },
          {
            "title": "Credit Distribution",
            "description": "See how your recent credit use is split across AI features. Each row shows the credits used and its share of the total, helping you spot which features use the most.",
            "screenshot": {
              "src": "/images/doc-images/ai-credits-usage-distribution.png",
              "alt": "Credit Distribution showing credit usage by AI feature",
              "aspectRatio": "h-[200px] sm:h-[240px] [&_img]:object-contain [&_img]:!scale-100",
              "caption": "Illustrative screenshot. Click to expand.",
              "className": "w-full max-w-[560px] mx-auto"
            }
          },
          {
            "title": "Activity",
            "description": "Review credit additions and usage deductions in Transactions, or switch to Billing for credit additions. Select View all to open the history, search for an entry, change the sort order, or browse more pages. Positive amounts add credits; negative amounts show credits used.",
            "screenshot": {
              "src": "/images/doc-images/ai-credits-activity-history.png",
              "alt": "AI credit Activity and expanded history showing credit additions, usage deductions, search and pagination",
              "aspectRatio": "h-[200px] sm:h-[240px] [&_img]:object-contain [&_img]:!scale-100",
              "caption": "Illustrative screenshot. Click to expand.",
              "className": "w-full max-w-[560px] mx-auto"
            }
          },
          {
            "title": "Plan access",
            "description": "Your current plan may not allow AI credit top-ups. If you see this message, upgrade to Pro to buy more credits.",
            "screenshot": {
              "src": "/images/doc-images/ai-credit-topup-plan-access.png",
              "alt": "AI credit top-up disabled on the current plan with an Upgrade plan to top up button",
              "caption": "Example of a plan restriction. Click to expand.",
              "aspectRatio": "h-[200px] sm:h-[240px] [&_img]:object-contain [&_img]:!scale-100",
              "className": "w-full max-w-[560px] mx-auto"
            }
          }
        ]
      }
    ],
    "troubleshooting": [
      {
        "question": "Does buying AI credits add WhatsApp balance?",
        "answer": "No. AI credits and WhatsApp WCC are separate balances. Select WhatsApp Credits to recharge messaging funds."
      },
      {
        "question": "Is runway a fixed expiry date?",
        "answer": "No. It is a forecast based on recent usage, not a guaranteed number of days or the date your credits expire."
      }
    ]
  },
  "whatsapp": {
    "tagline": "Check your WhatsApp balance, estimate messaging costs, and add funds when needed.",
    "description": "WhatsApp Credits (WCC) is your prepaid balance for applicable WhatsApp messaging charges. Check your funds, estimate a campaign cost, add money, and review past recharges in one place. AI-generated replies and content use the separate AI Credits wallet.",
    "copy": {
      "benefitsIntro": "Plan messaging costs and check your funds before sending.",
      "troubleshootingTitle": "WhatsApp Credit Questions",
      "troubleshootingIntro": "Estimates, recharge, and account access.",
      "answerLabel": "Answer:"
    },
    "screenshots": {
      "benefits": {
        "src": "/images/doc-images/whatsapp-wallet-overview-green.png",
        "alt": "WhatsApp wallet balance, category rates, audience size, estimated cost, balance check and recharge amount",
        "label": "WhatsApp balance, cost estimate & recharge",
        "caption": "Illustrative screenshot. Amounts and available options depend on your workspace.",
        "aspectRatio": "aspect-[1024/341] [&_img]:object-contain"
      }
    },
    "benefits": [
      {
        "title": "Plan Before You Send",
        "description": "Estimate the cost for your selected message category and audience before starting a campaign."
      },
      {
        "title": "Spot a Balance Shortfall",
        "description": "Compare the estimated cost with your available funds so you know whether to recharge."
      },
      {
        "title": "Choose Your Recharge Amount",
        "description": "Enter an amount or select a preset to add funds based on your messaging needs."
      },
      {
        "title": "Keep Messaging Costs Separate",
        "description": "Review WhatsApp spending in its own wallet, separately from the credits used to generate AI content."
      }
    ],
    "featureGuides": [
      {
        "title": "Estimate Costs and Recharge",
        "description": "Use the WhatsApp Credits (WCC) tab in Credits & Wallet.",
        "layout": "alternating",
        "items": [
          {
            "title": "1. Check your WhatsApp balance",
            "description": "Open WhatsApp Credits to see your available balance. The wallet gauge gives a quick view of the funds remaining before you estimate a campaign or recharge.",
            "screenshot": {
              "src": "/images/doc-images/whatsapp-wallet-balance-step.png",
              "alt": "WhatsApp wallet balance and gauge",
              "caption": "Illustrative screenshot. Use your workspace for current amounts and rates. Click to expand."
            }
          },
          {
            "title": "2. Estimate your campaign cost",
            "description": "Choose Marketing, Utility, Authentication, or Service. Set your audience size with the slider or number field, then review Estimated Cost and the balance check. The estimate uses your configured category rate and audience size.",
            "screenshot": {
              "src": "/images/doc-images/whatsapp-campaign-cost-calculator.png",
              "alt": "WhatsApp campaign calculator showing categories, audience size, estimated cost and balance check",
              "caption": "Illustrative screenshot. Use your workspace for current amounts and rates. Click to expand."
            }
          },
          {
            "title": "3. Add funds",
            "description": "Enter a recharge amount, use the plus or minus buttons, or choose a preset. Review the approximate Marketing message count. Select Add funds to wallet, check the payment details, and complete checkout.",
            "screenshot": {
              "src": "/images/doc-images/whatsapp-wallet-add-funds.png",
              "alt": "WhatsApp recharge amount, presets, approximate Marketing message count and Add funds button",
              "caption": "Illustrative screenshot. Use your workspace for current amounts and rates. Click to expand."
            }
          },
          {
            "title": "4. Check the result",
            "description": "After payment, confirm your updated balance and find the entry in Recharge History. Check the date, amount, payment or order ID, status, and method. Use search, sorting, or View all recharges to find older records.",
            "screenshot": {
              "src": "/images/doc-images/whatsapp-wallet-recharge-history.png",
              "alt": "WhatsApp recharge history with dates, amounts, payment references, status, method and search",
              "caption": "Illustrative screenshot. Use your workspace for current amounts and rates. Click to expand."
            }
          }
        ]
      }
    ],
    "troubleshooting": [
      {
        "question": "Does an estimate send messages?",
        "answer": "No. The calculator only estimates the cost. Sending a campaign is a separate action."
      },
      {
        "question": "Why is the approximate message count different from my estimate?",
        "answer": "The recharge card estimates Marketing messages for the amount you add. The cost calculator uses your selected category and audience size."
      },
      {
        "question": "Are the screenshot prices fixed?",
        "answer": "No. The images are examples. Use the rates and payment totals currently shown in your workspace."
      }
    ]
  }
};

export const creditsWalletDetail = {
  ...walletVariants.ai,
  ...{
  "slug": "credits-wallet",
  "aliasSlugs": [
    "features/credits-wallet",
    "billing/credits-wallet"
  ],
  "featureNumber": "07",
  "category": "Financial Infrastructure & Token Metering",
  "title": "Credits, Wallet & Token Metering",
  "visualKey": "wallet",
  "visualFrameless": true,
  "hideConfiguration": true,
  "hideVerification": true
},
  walletVariants,
};
