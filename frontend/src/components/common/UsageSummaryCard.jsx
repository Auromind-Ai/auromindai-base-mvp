import { ArrowRight } from "lucide-react";

// Demo data shaped like what /workspace/entitlements + /workspace/usage
// would return. Swap this for your real API response.
const DEFAULT_DATA = {
  aiCredits: { used: 7.16, total: 100 },
  wccWallet: { balance: 0, currency: "₹" },
  flowQuota: { used: 1, total: 2 },
};

// WCC is a prepaid wallet, not a used/total quota — status label instead
// of a percentage, same language as the WCC tab (Empty/Low/Healthy/Full).
function getWccStatus(balance, fillPercentage, statusOverride) {
  let pct = fillPercentage;
  if (pct === null || pct === undefined || isNaN(Number(pct))) {
    if (balance <= 0) pct = 0;
    else if (balance < 500) pct = 25;
    else if (balance < 1500) pct = 65;
    else pct = 95;
  }

  const numericPct = Math.max(0, Math.min(100, Number(pct) || 0));

  let label = statusOverride;
  let text = "text-emerald-400";
  let bar = "bg-emerald-500";

  if (balance <= 0 || numericPct <= 0) {
    label = label || "Empty";
    text = "text-rose-400";
    bar = "bg-rose-500";
  } else if (numericPct <= 25) {
    label = label || "Low";
    text = "text-amber-400";
    bar = "bg-amber-500";
  } else if (numericPct < 90) {
    label = label || "Healthy";
    text = "text-emerald-400";
    bar = "bg-emerald-500";
  } else {
    label = label || "Full";
    text = "text-teal-300";
    bar = "bg-teal-400";
  }

  return { label, text, bar, width: `${Math.max(4, numericPct)}%` };
}

function UsageRow({ label, value, sub, barClass, widthPct, isLast }) {
  return (
    <div className={isLast ? "" : "mb-6"}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-sm font-medium text-white">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barClass} rounded-full transition-all duration-500`}
          style={{ width: widthPct }}
        />
      </div>
      {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}

export default function UsageSummaryCard({ data = DEFAULT_DATA, isStandalone = false }) {
  const { aiCredits, wccWallet, flowQuota } = data || DEFAULT_DATA;

  const aiPct = Math.min(100, (((aiCredits?.used ?? 0) / (aiCredits?.total || 1)) * 100));
  
  const isUnlimitedFlow = (flowQuota?.total_quota ?? flowQuota?.total) === -1;
  const flowUsedVal = flowQuota?.used_quota ?? flowQuota?.used ?? 0;
  const flowTotalVal = flowQuota?.total_quota ?? flowQuota?.total ?? 0;
  const flowPurchasedVal = flowQuota?.purchased_quota ?? flowQuota?.purchased ?? 0;
  const flowPct = isUnlimitedFlow ? 100 : Math.min(100, ((flowUsedVal / (flowTotalVal || 1)) * 100));
  const flowLeft = isUnlimitedFlow ? "∞" : (flowQuota?.remaining_quota ?? flowQuota?.remaining ?? Math.max(0, flowTotalVal - flowUsedVal));
  const wcc = getWccStatus(wccWallet?.balance ?? 0, wccWallet?.fillPercentage, wccWallet?.status);

  const aiRemainingVal = aiCredits?.remaining !== undefined && aiCredits?.remaining !== null
    ? Number(aiCredits.remaining)
    : (aiCredits?.credits_balance !== undefined && aiCredits?.credits_balance !== null
      ? Number(aiCredits.credits_balance)
      : Math.max(0, (aiCredits?.total ?? 0) - (aiCredits?.used ?? 0)));

  const aiSubText = aiCredits?.locked
    ? (aiCredits?.status_message || `${aiRemainingVal.toFixed(2)} remaining (🔒 locked)`)
    : `${aiRemainingVal.toFixed(2)} remaining`;

  const cardContent = (
    <div className="w-full bg-[#070012] border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-white">Usage Summary</h2>
          <span className="text-xs text-slate-400 bg-slate-800/80 border border-slate-700/50 px-2.5 py-1 rounded-full">
            This month
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-6">Current billing cycle usage</p>

        <UsageRow
          label="AI Credits Used"
          value={`${aiCredits?.used ?? 0} / ${aiCredits?.total ?? 0}`}
          sub={aiSubText}
          barClass="bg-gradient-to-r from-violet-500 to-fuchsia-500"
          widthPct={`${aiPct}%`}
        />

        <UsageRow
          label="WCC Wallet Balance"
          value={
            <span className="flex items-center gap-1.5 justify-end">
              {wccWallet?.currency || "₹"}
              {(wccWallet?.balance ?? 0).toFixed(2)}
              <span className={`text-xs ${wcc.text}`}>· {wcc.label}</span>
            </span>
          }
          sub={(wccWallet?.balance ?? 0) <= 0 ? "Message sending paused — recharge to resume" : "Prepaid balance"}
          barClass={wcc.bar}
          widthPct={wcc.width}
        />

        <UsageRow
          label="Flow Quota"
          value={isUnlimitedFlow ? "Unlimited" : `${flowUsedVal} / ${flowTotalVal}`}
          sub={
            isUnlimitedFlow
              ? "Unlimited flow executions"
              : flowPurchasedVal > 0
              ? `${flowLeft} flow available (+${flowPurchasedVal} purchased)`
              : `${flowLeft} flow available`
          }
          barClass="bg-gradient-to-r from-amber-500 to-orange-400"
          widthPct={`${flowPct}%`}
          isLast
        />
      </div>

    </div>
  );

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          {cardContent}
        </div>
      </div>
    );
  }

  return cardContent;
}
