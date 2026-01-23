'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext({
    isSettingsOpen: false,
    setIsSettingsOpen: () => { },
    selectedModel: 'auto',
    setSelectedModel: () => { },
});

export const SettingsProvider = ({ children }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('auromind_default_model') || 'auto';
        }
        return 'auto';
    });

    const updateModel = (model) => {
        setSelectedModel(model);
        localStorage.setItem('auromind_default_model', model);
    };

    return (
        <SettingsContext.Provider value={{
            isSettingsOpen,
            setIsSettingsOpen,
            selectedModel,
            setSelectedModel: updateModel
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
