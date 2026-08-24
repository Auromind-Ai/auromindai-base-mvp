'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  IndianRupee, 
  MessageSquare, 
  RefreshCw, 
  Search, 
  ExternalLink,
  User,
  Filter,
  X,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  // Helper to read cookies safely in client
  const getCookie = (name) => {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : '';
  };

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/admin/inquiries`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch:', res.status, res.statusText);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleStatusChange = async (inquiryId, newStatus) => {
    const formattedStatus = newStatus.toLowerCase().trim();
    setUpdatingId(inquiryId);

    // Retrieve CSRF token from session / localStorage / cookies
    const csrfToken = 
      (typeof window !== 'undefined' && (
        sessionStorage.getItem('csrf_token') ||
        sessionStorage.getItem('admin_csrf_token') ||
        localStorage.getItem('csrf_token') ||
        localStorage.getItem('admin_csrf_token')
      )) || 
      getCookie('csrf_token') || 
      getCookie('csrftoken') || 
      '';

    try {
      const res = await fetch(`${BACKEND_URL}/admin/inquiries/${inquiryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'x-admin-csrf-token': csrfToken,
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ status: formattedStatus }),
      });

      if (res.ok) {
        setInquiries((prev) =>
          prev.map((item) =>
            item.id === inquiryId ? { ...item, status: formattedStatus } : item
          )
        );
        if (selectedInquiry && selectedInquiry.id === inquiryId) {
          setSelectedInquiry((prev) => ({ ...prev, status: formattedStatus }));
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to update status:', res.status, errData);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredInquiries = inquiries.filter((item) => {
    const nameMatch = item.name ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const emailMatch = item.email ? item.email.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const companyMatch = item.company ? item.company.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const phoneMatch = item.phone ? item.phone.includes(searchQuery) : false;

    const matchesSearch = nameMatch || emailMatch || companyMatch || phoneMatch;
    const itemStatus = (item.status || 'pending').toLowerCase();
    const filterStatus = statusFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || itemStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusStyles = (status) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'completed':
      case 'converted':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400';
      case 'contacted':
        return 'bg-blue-500/15 border-blue-500/40 text-blue-400';
      default:
        return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Contact & Enterprise Inquiries
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#C084FC]">
                {filteredInquiries.length} Leads
              </span>
            </div>
            <p className="text-sm text-white/60 mt-1">
              Manage and follow up on incoming leads from the Pricing &ldquo;Let&apos;s Talk&rdquo; form.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchInquiries}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition cursor-pointer border border-white/10 active:scale-95"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh Leads
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, company, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-[#0e0e12] text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#7C3AED] transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-white/50" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 px-3.5 rounded-xl border border-white/10 bg-[#0e0e12] text-sm text-white focus:outline-none focus:border-[#7C3AED] cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Inquiries List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-24 text-center text-white/50 animate-pulse">
              Loading inquiries...
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="py-20 text-center rounded-3xl border border-white/10 bg-[#0e0e12] text-white/50">
              No inquiries found.
            </div>
          ) : (
            filteredInquiries.map((inq) => (
              <motion.div
                key={inq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-white/10 bg-[#0e0e12] p-6 shadow-xl hover:border-[#7C3AED]/40 transition duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-3.5 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#C084FC]">
                        <User size={15} />
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-wide">{inq.name}</h3>
                    </div>

                    {inq.company && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80">
                        <Building2 size={13} /> {inq.company}
                      </span>
                    )}

                    <div className="relative">
                      <select
                        value={(inq.status || 'pending').toLowerCase()}
                        disabled={updatingId === inq.id}
                        onChange={(e) => handleStatusChange(inq.id, e.target.value)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold border cursor-pointer focus:outline-none transition appearance-none pr-7 ${getStatusStyles(
                          inq.status
                        )} ${updatingId === inq.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="pending" className="bg-[#0e0e12] text-amber-400">Pending</option>
                        <option value="contacted" className="bg-[#0e0e12] text-blue-400">Contacted</option>
                        <option value="completed" className="bg-[#0e0e12] text-emerald-400">Completed</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/60" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-white/70">
                    <a
                      href={`mailto:${inq.email}`}
                      className="inline-flex items-center gap-1.5 hover:text-[#C084FC] transition text-white/90"
                    >
                      <Mail size={14} className="text-[#7C3AED]" /> {inq.email}
                    </a>
                    <a
                      href={`tel:${inq.phone}`}
                      className="inline-flex items-center gap-1.5 hover:text-[#C084FC] transition text-white/90"
                    >
                      <Phone size={14} className="text-[#7C3AED]" /> {inq.phone}
                    </a>
                    {inq.budget && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                        <IndianRupee size={14} /> Budget: {inq.budget}
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-sm text-white/85 leading-relaxed flex items-start gap-3">
                    <MessageSquare size={16} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <p className="line-clamp-2">{inq.requirement}</p>
                  </div>
                </div>

                <div className="lg:w-56 flex flex-col justify-between items-start lg:items-end gap-4 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
                    <Calendar size={13} />
                    {new Date(inq.created_at || Date.now()).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="flex flex-col gap-2 w-full">
                    <a
                      href={`https://wa.me/${String(inq.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hi ${inq.name}, thanks for reaching out to Auromind regarding your requirement!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center px-4 py-2.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366] hover:text-black font-semibold text-xs transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>WhatsApp Lead</span>
                      <ExternalLink size={13} />
                    </a>

                    <button
                      type="button"
                      onClick={() => setSelectedInquiry(inq)}
                      className="w-full text-center px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedInquiry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInquiry(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0e0e12] p-6 sm:p-8 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-white">Inquiry Details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
                  className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3.5 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white/40 uppercase block">Full Name</span>
                    <span className="text-white font-medium text-base">{selectedInquiry.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 uppercase block mb-1 text-right">Status</span>
                    <div className="relative">
                      <select
                        value={(selectedInquiry.status || 'pending').toLowerCase()}
                        disabled={updatingId === selectedInquiry.id}
                        onChange={(e) => handleStatusChange(selectedInquiry.id, e.target.value)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold border cursor-pointer focus:outline-none transition appearance-none pr-7 ${getStatusStyles(
                          selectedInquiry.status
                        )}`}
                      >
                        <option value="pending" className="bg-[#0e0e12] text-amber-400">Pending</option>
                        <option value="contacted" className="bg-[#0e0e12] text-blue-400">Contacted</option>
                        <option value="completed" className="bg-[#0e0e12] text-emerald-400">Completed</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/60" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-white/40 uppercase block">Email</span>
                    <a href={`mailto:${selectedInquiry.email}`} className="text-[#C084FC] underline">
                      {selectedInquiry.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 uppercase block">Phone</span>
                    <span>{selectedInquiry.phone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-white/40 uppercase block">Company</span>
                    <span>{selectedInquiry.company || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 uppercase block">Budget</span>
                    <span className="text-emerald-400 font-semibold">{selectedInquiry.budget || 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-white/40 uppercase block mb-1">Requirement</span>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-white whitespace-pre-wrap leading-relaxed text-sm max-h-48 overflow-y-auto">
                    {selectedInquiry.requirement}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
                  className="w-full h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}