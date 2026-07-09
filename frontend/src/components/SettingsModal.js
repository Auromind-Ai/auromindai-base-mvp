'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import SettingsContent from './SettingsContent';

const SettingsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[1000px] md:h-[750px] bg-[#1f1f1f] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Close Button - Top Right Absolute */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-[#333] text-[#787878] hover:text-white transition-colors z-[60]"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex-1 overflow-hidden">
                            <SettingsContent />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SettingsModal;
