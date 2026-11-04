'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronRight, MapPin, MessageSquare } from 'lucide-react';
import { ReliefData } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface CitizenHomeProps {
  data: ReliefData;
  onNavigate: (tab: string) => void;
  onOpenSOS: () => void;
}

const HOLD_DURATION_MS = 1800; // 1.8 seconds

export default function CitizenHome({ data, onNavigate, onOpenSOS }: CitizenHomeProps) {
  const { isPowerSaving } = usePowerMode();
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const triggeredRef = useRef(false);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
    setIsHolding(false);
    triggeredRef.current = false;
  }, []);

  const startHold = useCallback(() => {
    if (triggeredRef.current) return;
    holdStartRef.current = Date.now();
    setIsHolding(true);
    setHoldProgress(0);

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(progress);

      if (progress >= 1 && !triggeredRef.current) {
        triggeredRef.current = true;
        clearInterval(holdTimerRef.current!);
        holdTimerRef.current = null;
        // Haptic feedback if available
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(50);
        }
        onOpenSOS();
        // Reset after opening
        setTimeout(() => {
          setHoldProgress(0);
          setIsHolding(false);
          triggeredRef.current = false;
        }, 300);
      }
    }, 30);
  }, [onOpenSOS, clearHoldTimer]);

  const cancelHold = useCallback(() => {
    clearHoldTimer();
  }, [clearHoldTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  // SVG ring progress for the SOS button
  const circleRadius = 70;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference * (1 - holdProgress);

  return (
    <div className="pb-28">
      {/* Title Header */}
      <header className="px-6 pb-2 pt-3">
        <p
          className={`text-xs font-extrabold uppercase tracking-widest ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
          }`}
        >
          Disaster Mesh · Mumbai
        </p>
        <h1
          className={`mt-1 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-white'
          }`}
        >
          Stay safe, Aarya.
        </h1>
        <p
          className={`mt-0.5 text-xs ${
            isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-300'
          }`}
        >
          Your community is within BLE reach.
        </p>
      </header>

      {/* Connectivity Banner */}
      <div
        className={`mx-5 mb-5 flex items-center gap-3.5 rounded-2xl border p-3.5 ${
          isPowerSaving
            ? 'bg-[rgba(0,255,65,0.06)] border-[rgba(0,255,65,0.18)] backdrop-blur-sm text-[#00ff41]'
            : 'border-red-900/60 bg-red-950/35 text-white'
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full flex-none ${
            isPowerSaving
              ? 'bg-[#00ff41]'
              : 'bg-red-500 shadow-[0_0_0_4px_rgba(255,38,61,0.25),0_0_10px_#ff263d]'
          }`}
        />
        <div className="flex-1">
          <b
            className={`block text-xs uppercase tracking-wider font-bold ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
            }`}
          >
            Offline Mesh Active
          </b>
          <p
            className={`text-xs block mt-0.5 ${
              isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-300'
            }`}
          >
            6 BLE nodes available in Mumbai sector
          </p>
        </div>
        <ChevronRight
          className={`w-4 h-4 ${isPowerSaving ? 'text-[#00ff41]' : 'text-stone-400'}`}
        />
      </div>

      {/* Main SOS Trigger Section — PRESS & HOLD */}
      <section className="flex flex-col items-center py-4">
        <p
          className={`mb-3 text-xs font-bold uppercase tracking-wider ${
            isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-300'
          }`}
        >
          Need urgent help?
        </p>

        {/* Circular SOS Button with hold-to-activate ring */}
        <div className="relative grid place-items-center size-40">
          {/* SVG progress ring */}
          <svg
            className="absolute inset-0 -rotate-90 pointer-events-none"
            width="160"
            height="160"
            viewBox="0 0 160 160"
          >
            <circle
              cx="80"
              cy="80"
              r={circleRadius}
              fill="none"
              stroke={isPowerSaving ? '#00ff41' : '#ff263d'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              opacity={holdProgress > 0 ? 1 : 0}
              style={{ transition: holdProgress > 0 ? 'none' : 'opacity 0.2s' }}
            />
          </svg>

          <button
            type="button"
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            className={`grid size-36 place-items-center rounded-full select-none transition-all ${
              isHolding ? 'scale-95' : ''
            } ${
              isPowerSaving
                ? 'border-2 border-[#00ff41] bg-[rgba(0,255,65,0.08)] backdrop-blur-sm text-[#00ff41]'
                : 'border border-red-400 bg-[radial-gradient(circle,#ff5e4f_0_42%,#e91e3a_43%_57%,rgba(121,20,34,.55)_58%_63%,transparent_64%)] shadow-[0_0_55px_rgba(242,37,53,.45)] text-white hover:brightness-110'
            }`}
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <span className="text-center pointer-events-none">
              <b className="block text-3xl font-extrabold tracking-wider">SOS</b>
              <small className="text-[11px] font-bold uppercase tracking-wider block mt-0.5">
                {isHolding
                  ? `${Math.round(holdProgress * 100)}%`
                  : 'Press & Hold'}
              </small>
            </span>
          </button>
        </div>

        <p
          className={`mt-4 text-xs ${
            isPowerSaving ? 'text-[rgba(0,255,65,0.65)]' : 'text-stone-400'
          }`}
        >
          Hold for {(HOLD_DURATION_MS / 1000).toFixed(1)}s to activate emergency SOS
        </p>
      </section>

      {/* Quick Access Section */}
      <div className="px-5 mt-4">
        <p
          className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${
            isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'
          }`}
        >
          Quick access
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Safe Zones Button */}
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className={`p-4 rounded-3xl border text-left flex flex-col justify-between min-h-[105px] transition-all ${
              isPowerSaving
                ? 'bg-[rgba(0,255,65,0.06)] border-[rgba(0,255,65,0.18)] text-[#00ff41] hover:bg-[rgba(0,255,65,0.1)] backdrop-blur-sm'
                : 'bg-gradient-to-br from-[#211313] to-[#111111] border-[#4d2c29] text-white hover:border-red-500/50'
            }`}
          >
            <MapPin
              className={`w-6 h-6 ${isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'}`}
            />
            <div>
              <b className="text-sm font-bold block mt-2">Safe Zones</b>
              <small
                className={`text-xs block mt-0.5 ${
                  isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'
                }`}
              >
                Mumbai relief shelters & routes
              </small>
            </div>
          </button>

          {/* WhatsApp BLE Chats Button */}
          <button
            type="button"
            onClick={() => onNavigate('chats')}
            className={`p-4 rounded-3xl border text-left flex flex-col justify-between min-h-[105px] transition-all ${
              isPowerSaving
                ? 'bg-[rgba(0,255,65,0.06)] border-[rgba(0,255,65,0.18)] text-[#00ff41] hover:bg-[rgba(0,255,65,0.1)] backdrop-blur-sm'
                : 'bg-gradient-to-br from-[#211313] to-[#111111] border-[#4d2c29] text-white hover:border-red-500/50'
            }`}
          >
            <MessageSquare
              className={`w-6 h-6 ${isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'}`}
            />
            <div>
              <b className="text-sm font-bold block mt-2">BLE Chats</b>
              <small
                className={`text-xs block mt-0.5 ${
                  isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'
                }`}
              >
                Direct chats & community groups
              </small>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
