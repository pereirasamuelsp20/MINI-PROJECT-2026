'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface PowerModeContextType {
  isPowerSaving: boolean;
  togglePowerSaving: () => void;
  setPowerSaving: (enabled: boolean) => void;
}

const PowerModeContext = createContext<PowerModeContextType>({
  isPowerSaving: false,
  togglePowerSaving: () => {},
  setPowerSaving: () => {},
});

export function PowerModeProvider({ children }: { children: React.ReactNode }) {
  const [isPowerSaving, setIsPowerSavingState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('disaster_mesh_power_saving');
      if (saved === 'true') {
        setIsPowerSavingState(true);
        document.documentElement.classList.add('power-saving-mode');
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const setPowerSaving = (enabled: boolean) => {
    setIsPowerSavingState(enabled);
    try {
      localStorage.setItem('disaster_mesh_power_saving', enabled ? 'true' : 'false');
    } catch {
      // ignore
    }
    if (enabled) {
      document.documentElement.classList.add('power-saving-mode');
    } else {
      document.documentElement.classList.remove('power-saving-mode');
    }
  };

  const togglePowerSaving = () => {
    setPowerSaving(!isPowerSaving);
  };

  return (
    <PowerModeContext.Provider
      value={{
        isPowerSaving,
        togglePowerSaving,
        setPowerSaving,
      }}
    >
      {children}
    </PowerModeContext.Provider>
  );
}

export function usePowerMode() {
  return useContext(PowerModeContext);
}

