'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Navigation, ShieldCheck, Check } from 'lucide-react';
import { Alert, AlertNeed, ReliefData } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface LiveSOSFeedProps {
  data: ReliefData;
  onVerify: (id: string) => void;
  onResolve: (id: string) => void;
}

export default function LiveSOSFeed({ data, onVerify, onResolve }: LiveSOSFeedProps) {
  const { isPowerSaving } = usePowerMode();
  const [filter, setFilter] = useState<string>('all');

  const filteredAlerts = filter === 'all'
    ? data.alerts
    : data.alerts.filter((a) => a.need.toLowerCase() === filter.toLowerCase());

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-6 pb-3 pt-2">
        <p className={`text-[8px] font-extrabold uppercase tracking-[0.2em] ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-red-400'
        }`}>
          Live mesh feed
        </p>
        <h1 className={`mt-1 text-[23px] font-extrabold tracking-tight ${
          isPowerSaving ? 'text-[#00ff41]' : 'text-white'
        }`}>
          SOS alerts
        </h1>
        <p className={`mt-1 text-[11px] ${
          isPowerSaving ? 'text-[#15803d]' : 'text-stone-400'
        }`}>
          {data.alerts.length} requests received by nearby relays
        </p>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto px-6 pb-3 no-scrollbar">
        {['all', 'Medical', 'Trapped', 'Supplies', 'Evacuation'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all ${
              filter === item
                ? isPowerSaving
                  ? 'bg-[#00ff41] text-black font-extrabold'
                  : 'bg-red-500 text-white shadow-[0_0_10px_rgba(255,38,61,0.4)]'
                : isPowerSaving
                ? 'border border-[#0d3815] bg-black text-[#15803d]'
                : 'border border-red-950 bg-white/5 text-stone-400 hover:text-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3 px-6 mt-2">
        {filteredAlerts.map((alert) => (
          <article
            key={alert.id}
            className={`p-4 rounded-2xl border transition-colors ${
              isPowerSaving
                ? 'bg-black border-[#0d3815] text-[#00ff41]'
                : 'bg-[#181111] border-red-950/80 text-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`p-2.5 rounded-xl flex-none ${
                isPowerSaving ? 'bg-[#0d3815] text-[#00ff41]' : 'bg-red-500/15 text-red-400'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <b className="text-sm">{alert.need} needed</b>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[7px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      alert.status === 'verified'
                        ? isPowerSaving
                          ? 'border border-[#00ff41] text-[#00ff41]'
                          : 'bg-emerald-500/20 text-emerald-400'
                        : alert.status === 'resolved'
                        ? 'bg-blue-500/20 text-blue-400'
                        : isPowerSaving
                        ? 'border border-[#15803d] text-[#15803d]'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {alert.status}
                    </span>
                    <span className={`text-[7px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      alert.priority === 'urgent'
                        ? 'bg-red-500 text-white'
                        : isPowerSaving
                        ? 'text-[#15803d]'
                        : 'bg-white/10 text-stone-300'
                    }`}>
                      {alert.priority}
                    </span>
                  </div>
                </div>

                <p className={`mt-2 text-xs leading-relaxed ${
                  isPowerSaving ? 'text-[#15803d]' : 'text-stone-300'
                }`}>
                  {alert.details}
                </p>

                <div className={`mt-3 flex items-center justify-between text-[8px] border-t pt-2.5 ${
                  isPowerSaving ? 'border-[#0d3815] text-[#15803d]' : 'border-white/5 text-stone-500'
                }`}>
                  <span>
                    {alert.citizenName} · {alert.area}
                  </span>
                  <span>{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Operator Actions (Verify / Resolve) */}
                <div className="mt-3 flex items-center gap-2">
                  {alert.status === 'new' && (
                    <button
                      type="button"
                      onClick={() => onVerify(alert.id)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                        isPowerSaving
                          ? 'border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black'
                          : 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/50'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify incident
                    </button>
                  )}
                  {alert.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => onResolve(alert.id)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                        isPowerSaving
                          ? 'border border-[#15803d] text-[#15803d] hover:text-[#00ff41]'
                          : 'bg-white/5 border border-white/10 text-stone-400 hover:text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="p-8 text-center border border-dashed border-red-950 rounded-2xl text-stone-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-stone-600" />
            <b className="text-xs block text-stone-400">No active alerts</b>
            <p className="text-[9px] mt-1">Incoming citizen alerts will appear here over BLE mesh.</p>
          </div>
        )}
      </div>
    </div>
  );
}

