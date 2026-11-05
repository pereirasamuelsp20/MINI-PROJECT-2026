'use client';

import React from 'react';
import { Megaphone, AlertCircle, Radio, Users, CheckCircle, Clock, Map, Navigation } from 'lucide-react';
import { ReliefData, Alert } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface ResponderDashboardProps {
  data: ReliefData;
  onNavigate: (tab: string) => void;
  onOpenBroadcast: () => void;
  onVerifyAlert?: (id: string) => void;
  onNavigateToAlert?: (alert: Alert) => void;
}

export default function ResponderDashboard({
  data,
  onNavigate,
  onOpenBroadcast,
  onVerifyAlert,
  onNavigateToAlert,
}: ResponderDashboardProps) {
  const { isPowerSaving } = usePowerMode();
  const unverifiedCount = data.alerts.filter((a) => a.status === 'new').length;

  return (
    <div className="pb-28">
      {/* Header */}
      <header className="px-6 pb-2 pt-3">
        <p
          className={`text-xs font-extrabold uppercase tracking-widest ${
            isPowerSaving ? 'text-red-400' : 'text-red-400'
          }`}
        >
          Incident Command Hub
        </p>
        <h1
          className={`mt-1 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-white' : 'text-white'
          }`}
        >
          Operations Overview
        </h1>
        <p
          className={`mt-0.5 text-xs ${
            isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
          }`}
        >
          Mumbai Sector · Disaster Control Unit
        </p>
      </header>

      {/* Online Status Banner */}
      <div
        className={`mx-5 mb-4 flex items-center gap-3.5 rounded-2xl border p-3.5 ${
          isPowerSaving
            ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] backdrop-blur-sm text-white'
            : 'border-emerald-900/50 bg-emerald-950/20 text-white'
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full flex-none ${
            isPowerSaving ? 'bg-[#4ADE80]' : 'bg-emerald-400 shadow-[0_0_8px_#00d294]'
          }`}
        />
        <div className="flex-1">
          <b
            className={`block text-xs uppercase tracking-wider font-bold ${
              isPowerSaving ? 'text-white' : 'text-emerald-400'
            }`}
          >
            Responder Station Active
          </b>
          <small
            className={`text-xs block mt-0.5 ${
              isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
            }`}
          >
            Monitoring BLE mesh hops and citizen SOS broadcasts
          </small>
        </div>
      </div>

      {/* Primary Action Buttons: Broadcast & Tactical Map */}
      <div className="px-5 mb-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onOpenBroadcast}
          className={`py-3.5 px-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider transition-all text-center border ${
            isPowerSaving
              ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white hover:bg-[rgba(74,222,128,0.05)]'
              : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-[0_12px_30px_rgba(207,20,45,0.35)] hover:brightness-110'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Broadcast Alert</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('map')}
          className={`py-3.5 px-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider transition-all text-center border ${
            isPowerSaving
              ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white hover:bg-[rgba(74,222,128,0.05)]'
              : 'border-emerald-600/60 bg-emerald-950/30 text-emerald-300 shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:bg-emerald-950/50'
          }`}
        >
          <Map className={`w-4 h-4 ${isPowerSaving ? 'text-white' : 'text-emerald-400'}`} />
          <span>Tactical MapNav</span>
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 px-5 mb-5">
        <div
          className={`p-4 rounded-3xl border text-center ${
            isPowerSaving
              ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] backdrop-blur-sm'
              : 'bg-white/[0.04] border-[#4a2d2a]'
          }`}
        >
          <b
            className={`text-3xl block font-extrabold ${
              isPowerSaving
                ? 'text-white'
                : unverifiedCount > 0
                ? 'text-red-500'
                : 'text-white'
            }`}
          >
            {String(data.alerts.length).padStart(2, '0')}
          </b>
          <small
            className={`text-xs uppercase tracking-wider mt-1 block font-semibold ${
              isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'
            }`}
          >
            SOS Requests ({unverifiedCount} new)
          </small>
        </div>

        <div
          className={`p-4 rounded-3xl border text-center ${
            isPowerSaving
              ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] backdrop-blur-sm'
              : 'bg-white/[0.04] border-[#4a2d2a]'
          }`}
        >
          <b
            className={`text-3xl block font-extrabold ${
              isPowerSaving ? 'text-white' : 'text-emerald-400'
            }`}
          >
            06
          </b>
          <small
            className={`text-xs uppercase tracking-wider mt-1 block font-semibold ${
              isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'
            }`}
          >
            Active Relays (Mumbai)
          </small>
        </div>
      </div>

      {/* Latest SOS Alerts Section */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p
            className={`text-xs font-bold uppercase tracking-wider ${
              isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'
            }`}
          >
            Latest SOS alerts
          </p>
          <button
            type="button"
            onClick={() => onNavigate('sos')}
            className={`text-xs font-bold uppercase tracking-wider ${
              isPowerSaving ? 'text-red-400' : 'text-red-400 hover:text-red-300'
            }`}
          >
            View all ({data.alerts.length})
          </button>
        </div>

        <div className="space-y-3">
          {data.alerts.slice(0, 3).map((alert) => (
            <article
              key={alert.id}
              className={`p-4 rounded-3xl border transition-colors ${
                isPowerSaving
                  ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] backdrop-blur-sm text-white'
                  : 'bg-[#181111] border-red-950/80 text-white'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={`p-2.5 rounded-2xl flex-none ${
                    isPowerSaving
                      ? 'border border-[rgba(74,222,128,0.32)] text-red-400 bg-[rgba(11,24,15,0.97)]'
                      : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <b className="text-sm font-bold truncate">{alert.need} needed</b>
                    <span
                      className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                        alert.priority === 'urgent'
                          ? 'bg-red-600 text-white'
                          : isPowerSaving
                          ? 'text-white border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)]'
                          : 'bg-white/10 text-stone-300'
                      }`}
                    >
                      {alert.priority}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${
                      isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
                    }`}
                  >
                    {alert.details}
                  </p>
                  <div className={`mt-3 flex items-center justify-between text-xs pt-2 border-t ${isPowerSaving ? 'border-[rgba(74,222,128,0.32)]' : 'border-white/5'}`}>
                    <span className={isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'}>
                      {alert.citizenName} · {alert.area}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {onNavigateToAlert && (
                        <button
                          type="button"
                          onClick={() => onNavigateToAlert(alert)}
                          className={`font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 ${
                            isPowerSaving
                              ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white'
                              : 'bg-red-600 text-white hover:bg-red-500'
                          }`}
                        >
                          <Navigation className="w-3 h-3" />
                          Nav
                        </button>
                      )}
                      {alert.status === 'new' && onVerifyAlert && (
                        <button
                          type="button"
                          onClick={() => onVerifyAlert(alert.id)}
                          className={`font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg text-[11px] ${
                            isPowerSaving
                              ? 'bg-[rgba(11,24,15,0.97)] border border-[rgba(74,222,128,0.32)] text-[#4ADE80] font-extrabold'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          }`}
                        >
                          Verify
                        </button>
                      )}
                    </div>
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
