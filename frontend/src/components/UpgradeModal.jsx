'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  title = "Upgrade Required", 
  description = "Get access to higher quota limits, pro models, and advanced features. Upgrade your workspace plan to continue." 
}) {
  const router = useRouter();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/30">
                <Sparkles size={32} className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                {description}
              </p>
              <div className="flex w-full gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium text-sm">
                  Maybe Later
                </button>
                <button 
                  onClick={() => { 
                    onClose(); 
                    router.push('/user/admin/credits'); 
                  }} 
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors font-medium text-sm shadow-lg shadow-purple-600/25"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
