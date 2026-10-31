'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Zap, BatteryCharging, ShieldAlert } from 'lucide-react';
import { usePowerMode } from '@/lib/powerMode';

interface AppHeaderProps {
  syncing?: boolean;
}

export default function AppHeader({ syncing }: AppHeaderProps) {
  const [time, setTime] = useState<string>('');
  const { isPowerSaving, togglePowerSaving } = usePowerMode();

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = window.setInterval(updateTime, 30000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={`flex h-11 items-center justify-between px-6 pt-2 text-[11px] font-semibold border-b transition-colors ${
      isPowerSaving 
        ? 'border-[#0d3815] bg-black text-[#00ff41]' 
        : 'border-white/5 bg-transparent text-stone-300'
    }`}>
      {/* Time */}
      <span className="tracking-wide">{time || '18:33'}</span>

      <div className="flex items-center gap-3">
        {/* Power Saving Mode Toggle Quick Button */}
        <button
          type="button"
          onClick={togglePowerSaving}
          title={isPowerSaving ? 'Switch to Normal Mode' : 'Switch to Ultra Power Saving (OLED Green)'}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest transition-all ${
            isPowerSaving
              ? 'bg-[#00ff41] text-black border border-[#00ff41] shadow-[0_0_8px_#00ff41]'
              : 'bg-white/5 text-stone-400 border border-white/10 hover:border-red-500/40 hover:text-white'
          }`}
        >
          <Zap className="w-2.5 h-2.5" />
          {isPowerSaving ? 'ECO ON' : 'ECO'}
        </button>

        {/* Mesh / BLE Radio State */}
        <span className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-stone-300'
        }`}>
          <Radio className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-orange-400' : isPowerSaving ? 'text-[#00ff41]' : 'text-red-500'}`} />
          {syncing ? 'SYNCING' : 'BLE MESH'}
        </span>
      </div>
    </div>
  );
}

