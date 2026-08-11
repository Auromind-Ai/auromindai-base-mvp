import React, { useState, useEffect } from "react"
import api from "@/lib/api"
import { 
  getPlatformSettings, 
  updatePlatformSettings, 
  getSalesRegister, 
  getTaxSummary 
} from "@/lib/api/billing"
import { 
  Save, 
  FileText, 
  PieChart, 
  Download, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Percent,
  MapPin,
  Briefcase
} from "lucide-react"

export default function GstSettingsTab({ setError, setSuccess, setActionLoading }) {
  // Settings Form State
  const [settings, setSettings] = useState({
    supplier_name: "",
    supplier_gstin: "",
    supplier_address: "",
    supplier_state: "",
    supplier_country: "IN",
    gst_rate: "18.0",
    gst_enabled: true,
    gst_tax_type: "exclusive"
  })

  // Telemetry Reports State
  const [salesRegister, setSalesRegister] = useState([])
  const [taxSummary, setTaxSummary] = useState([])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportLoading, setReportLoading] = useState(false)

  const fetchSettings = async () => {
    try {
      setActionLoading(true)
      const res = await getPlatformSettings()
      setSettings({
        supplier_name: res.supplier_name || "Auromind AI Private Limited",
        supplier_gstin: res.supplier_gstin || "33ABCDE1234F1Z5",
        supplier_address: res.supplier_address || "123, FinTech Hub, Chennai, Tamil Nadu",
        supplier_state: res.supplier_state || "Tamil Nadu",
        supplier_country: res.supplier_country || "IN",
        gst_rate: res.gst_rate !== undefined ? String(res.gst_rate) : "18.0",
        gst_enabled: res.gst_enabled !== undefined ? Boolean(res.gst_enabled) : true,
        gst_tax_type: res.gst_tax_type || "exclusive"
      })
    } catch (err) {
      setError(err.message || "Failed to load GST settings")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      
      const payload = {
        supplier_name: settings.supplier_name,
        supplier_gstin: settings.supplier_gstin,
        supplier_address: settings.supplier_address,
        supplier_state: settings.supplier_state,
        supplier_country: settings.supplier_country,
        gst_rate: parseFloat(settings.gst_rate),
        gst_enabled: settings.gst_enabled,
        gst_tax_type: settings.gst_tax_type
      }

      await updatePlatformSettings(payload)
      setSuccess("GST configurations saved successfully!")
    } catch (err) {
      setError(err.message || "Failed to update GST settings")
    } finally {
      setActionLoading(false)
    }
  }

  const fetchReports = async () => {
    try {
      setReportLoading(true)
      const monthParam = selectedMonth ? parseInt(selectedMonth) : null
      const yearParam = selectedYear ? parseInt(selectedYear) : null
      
      const sales = await getSalesRegister(monthParam, yearParam)
      const summary = await getTaxSummary(yearParam)
      
      setSalesRegister(sales || [])
      setTaxSummary(summary || [])
    } catch (err) {
      console.error("Failed to load telemetry reports", err)
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSettings()
      fetchReports()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      setActionLoading(true)
      const response = await api.requestRaw(`/billing/invoices/${invoiceId}/download`)
      if (!response.ok) throw new Error("Download failed")
      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/pdf")) {
        throw new Error("Invalid PDF response")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `invoice-${invoiceId}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      setSuccess("Invoice downloaded successfully!")
    } catch (err) {
      console.error("Failed to download invoice", err)
      setError("Failed to download invoice. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(amount)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 2-Column Layout: Settings Form & Telemetry Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GST Core Settings (Col Span 2) */}
        <div className="lg:col-span-2 bg-[#0c0c0e] border border-white/[0.06] rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Percent size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">GST Compliance Configuration</h2>
              <p className="text-[11px] text-gray-500">Configure corporate details for tax generation & snapshots</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1.5">Supplier Name</label>
                <input
                  type="text"
                  required
                  value={settings.supplier_name}
                  onChange={(e) => setSettings({ ...settings, supplier_name: e.target.value })}
                  placeholder="e.g. Auromind AI Private Limited"
                  className="w-full bg-[#070709] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1.5">Supplier GSTIN</label>
                <input
                  type="text"
                  required
                  value={settings.supplier_gstin}
                  onChange={(e) => setSettings({ ...settings, supplier_gstin: e.target.value })}
                  placeholder="e.g. 33ABCDE1234F1Z5"
                  className="w-full bg-[#070709] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 font-semibold mb-1.5">Registered Address</label>
              <textarea
                required
                rows={2}
                value={settings.supplier_address}
                onChange={(e) => setSettings({ ...settings, supplier_address: e.target.value })}
                placeholder="Corporate headquarters physical address..."
                className="w-full bg-[#070709] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition resize-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1.5">State (Place of Supply)</label>
                <input
                  type="text"
                  required
                  value={settings.supplier_state}
                  onChange={(e) => setSettings({ ...settings, supplier_state: e.target.value })}
                  placeholder="e.g. Tamil Nadu"
                  className="w-full bg-[#070709] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1.5">Country</label>
                <input
                  type="text"
                  required
                  value={settings.supplier_country}
                  onChange={(e) => setSettings({ ...settings, supplier_country: e.target.value })}
                  placeholder="IN"
                  className="w-full bg-[#070709] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1.5">GST Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settings.gst_rate}
                  onChange={(e) => setSettings({ ...settings, gst_rate: e.target.value })}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1.5">Tax Type</label>
                <select
                  value={settings.gst_tax_type}
                  onChange={(e) => setSettings({ ...settings, gst_tax_type: e.target.value })}
                  className="w-full bg-[#070709] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="exclusive">Exclusive</option>
                  <option value="inclusive">Inclusive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
              <div>
                <p className="text-xs font-semibold text-white">Enable GST Calculations</p>
                <p className="text-[10px] text-gray-500">Inject GST calculations on checkout and generate PDF invoices</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.gst_enabled}
                  onChange={(e) => setSettings({ ...settings, gst_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/20 text-white rounded-xl text-xs font-bold transition-all"
              >
                <Save size={14} />
                <span>Save GST Compliance Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* GST Fast Facts & Telemetry KPI Card */}
        <div className="bg-gradient-to-br from-[#0c0c0e] to-[#121216] border border-white/[0.06] rounded-3xl p-6 flex flex-col justify-between backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                GST Snapshot
              </span>
              <PieChart size={16} className="text-gray-500" />
            </div>

            <div>
              <p className="text-xs text-gray-500">Tax System Active</p>
              <h3 className="text-2xl font-bold mt-1 text-white flex items-center gap-2">
                <span>{settings.gst_enabled ? "Active" : "Disabled"}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${settings.gst_enabled ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`}></span>
              </h3>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Supplier State:</span>
                <span className="text-white font-mono">{settings.supplier_state}</span>
              </div>
              <div className="flex justify-between">
                <span>Applied Tax Rate:</span>
                <span className="text-white font-mono">{settings.gst_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Pricing Mode:</span>
                <span className="text-white font-mono uppercase">{settings.gst_tax_type}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl text-[10px] text-gray-500 mt-4">
            GST calculates <strong>CGST + SGST</strong> for Intra-state orders, and <strong>IGST</strong> for Inter-state orders in India automatically. Exports are zero-rated.
          </div>
        </div>

      </div>

      {/* Reports Section */}
      <div className="bg-[#0c0c0e] border border-white/[0.06] rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">GST Sales Register & Monthly Reports</h2>
              <p className="text-[11px] text-gray-500">Tax collections log & dynamic GSTR-1 preparation reports</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#070709] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i+1} value={i+1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-[#070709] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              >
                {[2025, 2026, 2027, 2028].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchReports}
              disabled={reportLoading}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold transition"
            >
              Generate Report
            </button>
          </div>
        </div>

        {reportLoading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500 border-r-2 border-purple-500/20 mx-auto mb-3"></div>
            <p className="text-gray-400 text-xs">Querying GST records...</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Monthly Tax Summary cards */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Tax Summary Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {taxSummary.length > 0 ? (
                  taxSummary.map((sum) => (
                    <div key={sum.month} className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-2xl flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-white">
                          {new Date(2000, sum.month - 1).toLocaleString('default', { month: 'long' })}
                        </span>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-md font-mono">
                          GST Collected
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-gray-400 mt-2">
                        <div className="flex justify-between">
                          <span>Taxable Value:</span>
                          <span className="text-white font-mono">{formatCurrency(sum.total_subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CGST:</span>
                          <span className="text-white font-mono">{formatCurrency(sum.total_cgst)}</span>
                        </div>
                        <div className="flex justify-between font-mono">
                          <span>SGST:</span>
                          <span className="text-white font-mono">{formatCurrency(sum.total_sgst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IGST:</span>
                          <span className="text-white font-mono">{formatCurrency(sum.total_igst)}</span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-white/5 font-bold text-white">
                          <span>Total Collected:</span>
                          <span>{formatCurrency(sum.total_collected)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 py-6 text-center text-gray-500 text-xs">
                    No summary telemetry available for year {selectedYear}
                  </div>
                )}
              </div>
            </div>

            {/* Sales Register Table */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Itemized Sales Register</h3>
              <div className="overflow-x-auto rounded-2xl border border-white/[0.05] bg-[#070709]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.05] bg-white/[0.02] text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Invoice No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Place of Supply</th>
                      <th className="py-3 px-4 text-right">Taxable Amount</th>
                      <th className="py-3 px-4 text-right">GST Rate</th>
                      <th className="py-3 px-4 text-right">GST Amount</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs">
                    {salesRegister.length > 0 ? (
                      salesRegister.map((inv) => (
                        <tr key={inv.invoice_number} className="hover:bg-white/[0.01] transition-all text-gray-300">
                          <td className="py-3 px-4 font-mono font-bold text-white text-[11px]">{inv.invoice_number}</td>
                          <td className="py-3 px-4 text-[11px]">
                            {new Date(inv.issued_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{inv.customer_name}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{inv.customer_gstin || "B2C / Unregistered"}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-400">{inv.place_of_supply}</td>
                          <td className="py-3 px-4 text-right font-mono">{formatCurrency(inv.subtotal)}</td>
                          <td className="py-3 px-4 text-right font-mono">{inv.gst_rate}%</td>
                          <td className="py-3 px-4 text-right font-mono text-indigo-400">{formatCurrency(inv.gst_amount)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">{formatCurrency(inv.total_amount)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              inv.status === "paid" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                                : inv.status === "refunded"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                                : "bg-red-500/10 text-red-400 border border-red-500/10"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDownloadInvoice(inv.invoice_number)}
                              title="Download PDF"
                              className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition"
                            >
                              <Download size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-gray-500 text-xs">
                          No itemized transactions matching current filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  )
}
