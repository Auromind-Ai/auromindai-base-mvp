'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import SettingsContent from './SettingsContent';

const SettingsModal = ({ isOpen, onClose }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const modalJSX = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-2 sm:inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] md:w-[90vw] lg:w-[85vw] lg:max-w-[1000px] h-[calc(100%-1rem)] sm:h-[calc(100%-2rem)] md:h-[85vh] lg:h-[80vh] lg:max-h-[750px] bg-[#070012] rounded-2xl border border-[rgba(157,157,157,0.43)] shadow-2xl z-[310] overflow-hidden flex flex-col"
                    >
                        {/* Close Button - Desktop Only Top Right Absolute */}
                        <button
                            onClick={onClose}
                            className="hidden lg:flex absolute top-4 right-4 p-1.5 rounded-md hover:bg-white/10 text-[#787878] hover:text-white transition-colors z-[320]"
                            aria-label="Close settings"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex-1 overflow-hidden">
                            <SettingsContent onClose={onClose} />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(modalJSX, document.body);
};

export default SettingsModal;
