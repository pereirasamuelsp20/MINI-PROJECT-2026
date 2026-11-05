'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Zap } from 'lucide-react';
import { usePowerMode } from '@/lib/powerMode';

interface AppHeaderProps {
  syncing?: boolean;
}

export default function AppHeader({ syncing }: AppHeaderProps) {
  const [time, setTime] = useState<string>('');
  const { isPowerSaving, togglePowerSaving, ecoConfig } = usePowerMode();

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
    const interval = window.setInterval(updateTime, ecoConfig.clockIntervalMs);
    return () => window.clearInterval(interval);
  }, [ecoConfig.clockIntervalMs]);

  return (
    <div
      className={`flex h-12 items-center justify-between px-6 pt-2 text-xs font-semibold border-b ${
        isPowerSaving
          ? 'border-[rgba(74,222,128,0.32)] bg-[rgba(8,19,12,0.96)] text-white'
          : 'border-white/5 bg-transparent text-stone-300'
      }`}
    >
      {/* Time */}
      <span className="tracking-wide font-mono">{time || '18:33'}</span>

      <div className="flex items-center gap-3">
        {/* Power Saving Mode Toggle — green glass pill when active */}
        <button
          type="button"
          onClick={togglePowerSaving}
          title={isPowerSaving ? 'Switch to Normal Mode' : 'Switch to ECO Power Saving'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isPowerSaving
              ? 'bg-[rgba(11,24,15,0.97)] text-white border border-[rgba(74,222,128,0.32)] backdrop-blur-sm'
              : 'bg-white/5 text-stone-300 border border-white/10 hover:border-red-500/40 hover:text-white'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${isPowerSaving ? 'text-[#4ADE80]' : ''}`} />
          {isPowerSaving ? 'ECO ON' : 'ECO'}
        </button>

        {/* Mesh / BLE Radio State */}
        <span
          className={`flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider ${
            isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
          }`}
        >
          <Radio
            className={`w-3.5 h-3.5 ${
              syncing
                ? isPowerSaving
                  ? 'text-white'
                  : 'animate-spin text-orange-400'
                : isPowerSaving
                ? 'text-red-500'
                : 'text-red-500'
            }`}
          />
          {syncing ? 'SYNCING' : 'MUMBAI MESH'}
        </span>
      </div>
    </div>
  );
}
