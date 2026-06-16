'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Calendar,
  Sparkles,
  Info,
  Check,
  Inbox
} from 'lucide-react';
import api from '../lib/api';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications(0, 50);
      if (res) {
        setNotifications(res.items || []);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Poll-free update: re-fetch when opening the dropdown
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Handle click outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'lead_alert':
        return <UserPlus size={16} className="text-emerald-400" />;
      case 'workflow_completed':
        return <CheckCircle2 size={16} className="text-teal-400" />;
      case 'workflow_failed':
        return <AlertCircle size={16} className="text-rose-400" />;
      case 'security_alert':
        return <ShieldAlert size={16} className="text-amber-400" />;
      case 'reminder':
        return <Calendar size={16} className="text-sky-400" />;
      case 'product_update':
        return <Sparkles size={16} className="text-indigo-400" />;
      default:
        return <Info size={16} className="text-zinc-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors shadow-sm select-none"
      >
        <Bell size={18} className="text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full ring-2 ring-[#050508]" />
        )}
      </div>

      {/* Popover Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-[#161618] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/15 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white/90 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="p-3 bg-white/5 rounded-full border border-white/10 mb-3 text-zinc-500">
                    <Inbox size={20} />
                  </div>
                  <p className="text-sm font-medium text-zinc-400">No notifications yet</p>
                  <p className="text-xs text-zinc-500 mt-1">We'll alert you when events happen.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={(e) => !item.is_read && handleMarkRead(item.id, e)}
                    className={`flex gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer text-left relative ${
                      !item.is_read ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    {/* Icon Column */}
                    <div className="mt-0.5 flex-shrink-0">
                      <div className="p-1.5 bg-white/5 border border-white/10 rounded-lg">
                        {getIcon(item.type)}
                      </div>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            !item.is_read ? 'font-semibold text-white/90' : 'text-zinc-400'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-zinc-500 flex-shrink-0">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-0.5 break-words line-clamp-2 leading-relaxed ${
                          !item.is_read ? 'text-zinc-300 font-medium' : 'text-zinc-500'
                        }`}
                      >
                        {item.message}
                      </p>
                    </div>

                    {/* Unread Action / Dot */}
                    {!item.is_read && (
                      <div className="flex flex-col justify-center pl-1">
                        <button
                          onClick={(e) => handleMarkRead(item.id, e)}
                          title="Mark as read"
                          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/10 text-indigo-400 transition-colors"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
