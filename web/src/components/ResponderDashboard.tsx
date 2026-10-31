'use client';

import React from 'react';
import { Megaphone, AlertCircle, Radio, Users, CheckCircle, Clock } from 'lucide-react';
import { ReliefData } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface ResponderDashboardProps {
  data: ReliefData;
  onNavigate: (tab: string) => void;
  onOpenBroadcast: () => void;
  onVerifyAlert?: (id: string) => void;
}

export default function ResponderDashboard({
  data,
  onNavigate,
  onOpenBroadcast,
  onVerifyAlert,
}: ResponderDashboardProps) {
  const { isPowerSaving } = usePowerMode();
  const unverifiedCount = data.alerts.filter((a) => a.status === 'new').length;

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-6 pb-3 pt-2">
        <p className={`text-[8px] font-extrabold uppercase tracking-[0.2em] ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
        }`}>
          Responder network
        </p>
        <h1 className={`mt-1 text-[23px] font-extrabold tracking-tight ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-white'
        }`}>
          Operations overview
        </h1>
        <p className={`mt-1 text-[11px] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          Relief Control · Unit 7
        </p>
      </header>

      {/* Online Status Banner */}
      <div className={`mx-6 mb-4 flex items-center gap-3 rounded-2xl border p-3 ${
        isPowerSaving
          ? 'bg-black border-[#0d3815] text-[#00ff41]'
          : 'border-emerald-900/50 bg-emerald-950/20 text-white'
      }`}>
        <span className={`w-2.5 h-2.5 rounded-full flex-none ${
          isPowerSaving ? 'bg-[#00ff41]' : 'bg-emerald-400 shadow-[0_0_8px_#00d294]'
        }`} />
        <div className="flex-1">
          <b className={`block text-[9px] uppercase tracking-wider ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-emerald-400'
          }`}>
            Responder online
          </b>
          <small className={`text-[9px] block ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            Synced across BLE mesh and cloud
          </small>
        </div>
      </div>

      {/* Broadcast Announcement Primary Action Button */}
      <div className="px-6 mb-4">
        <button
          type="button"
          onClick={onOpenBroadcast}
          className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider transition-all ${
            isPowerSaving
              ? 'border-2 border-[#00ff41] bg-black text-[#00ff41] shadow-[0_0_15px_#00ff41]'
              : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-[0_12px_30px_rgba(207,20,45,0.35)] hover:brightness-110'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Broadcast to area
        </button>
      </div>

      {/* Key Metrics / Operations Grid */}
      <div className="grid grid-cols-2 gap-3 px-6 mb-5">
        <div className={`p-3.5 rounded-2xl border text-center ${
          isPowerSaving
            ? 'bg-black border-[#0d3815]'
            : 'bg-white/[0.04] border-[#4a2d2a]'
        }`}>
          <b className={`text-2xl block font-extrabold ${
            isPowerSaving ? 'text-[#00ff41]' : unverifiedCount > 0 ? 'text-red-500' : 'text-white'
          }`}>
            {String(data.alerts.length).padStart(2, '0')}
          </b>
          <small className={`text-[8px] uppercase tracking-wider mt-1 block font-semibold ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            SOS Alerts ({unverifiedCount} new)
          </small>
        </div>

        <div className={`p-3.5 rounded-2xl border text-center ${
          isPowerSaving
            ? 'bg-black border-[#0d3815]'
            : 'bg-white/[0.04] border-[#4a2d2a]'
        }`}>
          <b className={`text-2xl block font-extrabold ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-emerald-400'
          }`}>
            06
          </b>
          <small className={`text-[8px] uppercase tracking-wider mt-1 block font-semibold ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            Relay Nodes
          </small>
        </div>
      </div>

      {/* Latest SOS Alerts Section */}
      <div className="px-6 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className={`text-[8px] font-bold uppercase tracking-widest ${
            isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
          }`}>
            Latest SOS alerts
          </p>
          <button
            type="button"
            onClick={() => onNavigate('sos')}
            className={`text-[8px] font-bold uppercase tracking-wider ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
            }`}
          >
            View all ({data.alerts.length})
          </button>
        </div>

        <div className="space-y-2.5">
          {data.alerts.slice(0, 3).map((alert) => (
            <article
              key={alert.id}
              className={`p-3.5 rounded-2xl border transition-colors ${
                isPowerSaving
                  ? 'bg-black border-[#0d3815] text-[#00ff41]'
                  : 'bg-[#181111] border-red-950/80 text-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`p-2 rounded-xl flex-none ${
                  isPowerSaving ? 'bg-[#0d3815] text-[#00ff41]' : 'bg-red-500/15 text-red-400'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <b className="text-xs truncate">{alert.need} needed</b>
                    <span className={`text-[7px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      alert.priority === 'urgent'
                        ? isPowerSaving
                          ? 'border border-[#00ff41] text-[#00ff41]'
                          : 'bg-red-500/20 text-red-400'
                        : isPowerSaving
                        ? 'text-[#15803d]'
                        : 'bg-white/10 text-stone-300'
                    }`}>
                      {alert.priority}
                    </span>
                  </div>
                  <p className={`text-[10px] mt-1 line-clamp-2 leading-relaxed ${
                    isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
                  }`}>
                    {alert.details}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[8px]">
                    <span className={isPowerSaving ? 'text-[#15803d]' : 'text-stone-500'}>
                      {alert.citizenName} · {alert.area}
                    </span>
                    {alert.status === 'new' && onVerifyAlert && (
                      <button
                        type="button"
                        onClick={() => onVerifyAlert(alert.id)}
                        className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isPowerSaving
                            ? 'bg-[#00ff41] text-black'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        Verify
                      </button>
                    )}
                    {alert.status === 'verified' && (
                      <span className={`font-bold uppercase ${
                        isPowerSaving ? 'text-[#00ff41]' : 'text-emerald-400'
                      }`}>
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

