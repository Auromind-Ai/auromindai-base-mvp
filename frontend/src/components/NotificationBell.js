'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Info,
  Inbox,
  X,
  ChevronRight,
  ArrowRight,
  Wallet,
  FileCheck,
} from 'lucide-react';
import api from '../lib/api';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    right: 0,
  });

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

  // Fetch again whenever dropdown is opened
  useEffect(() => {
    if (!isOpen) return;

    fetchNotifications();

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
 useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event) => {
      // Notification list kulla scroll aana close aaga koodadhu, page scroll aana close aaganum
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);


  // Click notification
  const handleNotificationClick = async (item) => {
    // Show full notification immediately
    setSelectedNotification(item);

    // Close notification dropdown
    setIsOpen(false);

    // Mark as read
    if (!item.is_read) {
      try {
        await api.markNotificationRead(item.id);

        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === item.id
              ? { ...notification, is_read: true }
              : notification
          )
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error(
          'Failed to mark notification as read:',
          err
        );
      }
    }
  };

  // Mark single notification as read
  const handleMarkRead = async (id, e) => {
    e.stopPropagation();

    try {
      await api.markNotificationRead(id);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(
        'Failed to mark notification as read:',
        err
      );
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error(
        'Failed to mark all notifications as read:',
        err
      );
    }
  };

  // Close full notification modal
  const closeNotificationModal = () => {
    setSelectedNotification(null);
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
      case 'payment_failed':
      case 'workflow_failed':
        return (
          <div className="w-10 h-10 rounded-full bg-[#3B1828] border border-[#f43f5e]/30 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-[#fb7185]" />
          </div>
        );

      case 'wallet_recharge':
      case 'lead_alert':
        return (
          <div className="w-10 h-10 rounded-full bg-[#132A24] border border-[#10b981]/30 flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-[#34d399]" />
          </div>
        );

      case 'ai_credits':
      case 'product_update':
        return (
          <div className="w-10 h-10 rounded-full bg-[#122738] border border-[#38bdf8]/30 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-[#38bdf8]" />
          </div>
        );

      case 'payment_confirmed':
      case 'workflow_completed':
        return (
          <div className="w-10 h-10 rounded-full bg-[#27183B] border border-[#a855f7]/30 flex items-center justify-center shrink-0">
            <FileCheck size={18} className="text-[#c084fc]" />
          </div>
        );

      case 'security_alert':
        return (
          <div className="w-10 h-10 rounded-full bg-[#362512] border border-[#f59e0b]/30 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} className="text-[#fbbf24]" />
          </div>
        );

      default:
        return (
          <div className="w-10 h-10 rounded-full bg-[#1E1B2E] border border-white/10 flex items-center justify-center shrink-0">
            <Info size={18} className="text-[#A78BFA]" />
          </div>
        );
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <div
          ref={buttonRef}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors shadow-sm select-none"
        >
          <Bell
            size={18}
            className="text-zinc-400"
          />

          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#814AC8] rounded-full ring-2 ring-[#050508]" />
          )}
        </div>

        {/* =========================
            Notification Dropdown
        ========================== */}

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[998] bg-black/35 backdrop-blur-[2px] transition-all sm:hidden"
              />

              <motion.div
                initial={{
                  opacity: 0,
                   y: 10, 
                   scale: 0.98
                  }}
                animate={{
                   opacity: 1,
                    y: 0,
                     scale: 1,
                     }}
                exit={{
                   opacity: 0,
                    y: 10, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="fixed inset-x-3.5 top-20 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-[410px] bg-[#0E0E15] border border-white/[0.08] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] z-[999] overflow-hidden flex flex-col font-sans"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h3 className="font-semibold text-white text-base tracking-tight">
                    Notifications
                  </h3>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-[#9d62f2] hover:text-[#b784fc] flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
                    >
                    </button>

                    <button
                      onClick={() => setIsOpen(false)}
                      className="sm:hidden p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* List with Base Purple Hover */}
                <div className="max-h-[380px] overflow-y-auto custom-scrollbar px-2 divide-y divide-white/[0.04]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-white/5 mx-auto flex items-center justify-center text-zinc-500 mb-2">
                        <Inbox size={18} />
                      </div>
                      <p className="text-sm font-medium text-zinc-400">
                        No notifications yet
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        We'll alert you when events happen.
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(item);
                        }}
                        className={`group flex items-start gap-3.5 p-3 rounded-2xl transition-all cursor-pointer border border-transparent ${
                          !item.is_read
                            ? 'bg-[#814AC8]/[0.06] hover:bg-[#814AC8]/[0.16] hover:border-[#814AC8]/30'
                            : 'hover:bg-[#814AC8]/[0.10] hover:border-[#814AC8]/20'
                        }`}
                      >
                        {getIcon(item.type)}

                        <div className="flex-1 min-w-0 pt-0.5">
                          <h4
                            className={`text-[13px] leading-tight truncate ${
                              !item.is_read
                                ? 'font-semibold text-white'
                                : 'font-medium text-zinc-300'
                            }`}
                          >
                            {item.title}
                          </h4>
                          <p className="text-[11.5px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.message}
                          </p>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-1 pt-0.5 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-zinc-500 font-medium">
                              {formatRelativeTime(item.created_at)}
                            </span>
                            {!item.is_read && (
                              <span className="w-2 h-2 rounded-full bg-[#814AC8] shadow-[0_0_8px_#814AC8]" />
                            )}
                          </div>
                          <ChevronRight
                            size={14}
                            className="text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/[0.06] bg-[#0A0A10]/50 text-center">
                  <button
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#a855f7] hover:text-[#c084fc] transition-colors py-1 cursor-pointer"
                  >
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onMouseDown={closeNotificationModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.15 }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-[#12121A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3 min-w-0">
                  {getIcon(selectedNotification?.type)}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      Notification Details
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {formatRelativeTime(selectedNotification?.created_at)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeNotificationModal}
                  className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                  aria-label="Close notification"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-6">
                <h2 className="text-lg sm:text-xl font-semibold text-white leading-snug break-words">
                  {selectedNotification?.title}
                </h2>
                <div className="h-px bg-white/10 my-4" />
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                  <p className="text-sm text-zinc-300 leading-7 whitespace-pre-wrap break-words">
                    {selectedNotification?.message}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationBell;