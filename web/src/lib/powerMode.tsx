'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

interface EcoConfig {
  /** Polling interval in milliseconds (60s in ECO vs 15s normal) */
  pollIntervalMs: number;
  /** Time display update interval (120s in ECO vs 30s normal) */
  clockIntervalMs: number;
  /** Whether to disable animations in components */
  disableAnimations: boolean;
  /** Whether to reduce backdrop blur for GPU savings */
  reduceBlur: boolean;
}

interface PowerModeContextType {
  isPowerSaving: boolean;
  togglePowerSaving: () => void;
  setPowerSaving: (enabled: boolean) => void;
  ecoConfig: EcoConfig;
}

const NORMAL_CONFIG: EcoConfig = {
  pollIntervalMs: 15000,
  clockIntervalMs: 30000,
  disableAnimations: false,
  reduceBlur: false,
};

const ECO_CONFIG: EcoConfig = {
  pollIntervalMs: 60000,
  clockIntervalMs: 120000,
  disableAnimations: true,
  reduceBlur: true,
};

const PowerModeContext = createContext<PowerModeContextType>({
  isPowerSaving: false,
  togglePowerSaving: () => {},
  setPowerSaving: () => {},
  ecoConfig: NORMAL_CONFIG,
});

export function PowerModeProvider({ children }: { children: React.ReactNode }) {
  const [isPowerSaving, setIsPowerSavingState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('disaster_mesh_power_saving');
      if (saved === 'true') {
        setIsPowerSavingState(true);
        document.documentElement.classList.add('power-saving-mode');
        applyEcoMeta(true);
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const setPowerSaving = useCallback((enabled: boolean) => {
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
    applyEcoMeta(enabled);
  }, []);

  const togglePowerSaving = useCallback(() => {
    setPowerSaving(!isPowerSaving);
  }, [isPowerSaving, setPowerSaving]);

  const ecoConfig = useMemo(
    () => (isPowerSaving ? ECO_CONFIG : NORMAL_CONFIG),
    [isPowerSaving]
  );

  return (
    <PowerModeContext.Provider
      value={{
        isPowerSaving,
        togglePowerSaving,
        setPowerSaving,
        ecoConfig,
      }}
    >
      {children}
    </PowerModeContext.Provider>
  );
}

export function usePowerMode() {
  return useContext(PowerModeContext);
}

/** Set dark color-scheme meta tag and reduce-motion preference for system-level battery savings */
function applyEcoMeta(enabled: boolean) {
  if (typeof document === 'undefined') return;

  // Color scheme meta
  let metaCS = document.querySelector('meta[name="color-scheme"]');
  if (enabled) {
    if (!metaCS) {
      metaCS = document.createElement('meta');
      metaCS.setAttribute('name', 'color-scheme');
      document.head.appendChild(metaCS);
    }
    metaCS.setAttribute('content', 'dark');
  } else if (metaCS) {
    metaCS.remove();
  }

  // Theme color meta — pure black for OLED
  let metaTC = document.querySelector('meta[name="theme-color"]');
  if (enabled) {
    if (!metaTC) {
      metaTC = document.createElement('meta');
      metaTC.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTC);
    }
    metaTC.setAttribute('content', '#000000');
  } else if (metaTC) {
    metaTC.setAttribute('content', '#080606');
  }
}
