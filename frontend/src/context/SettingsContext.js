'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext({
    isSettingsOpen: false,
    setIsSettingsOpen: () => { },
    selectedModel: 'auto',
    setSelectedModel: () => { },
    initialSection: 'my-account',
    setInitialSection: () => { },
    openSettings: () => { },
});

export const SettingsProvider = ({ children }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [initialSection, setInitialSection] = useState('my-account');
    const [selectedModel, setSelectedModel] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('orbionagents_default_model') || localStorage.getItem('auromind_default_model') || 'auto';
        }
        return 'auto';
    });

    const updateModel = (model) => {
        setSelectedModel(model);
        localStorage.setItem('orbionagents_default_model', model);
        localStorage.removeItem('auromind_default_model');
    };

    const openSettings = (section = 'my-account') => {
        setInitialSection(section);
        setIsSettingsOpen(true);
    };
    
    return (
        <SettingsContext.Provider value={{
            isSettingsOpen,
            setIsSettingsOpen,
            selectedModel,
            setSelectedModel: updateModel,
            initialSection,
            setInitialSection,
            openSettings
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);

