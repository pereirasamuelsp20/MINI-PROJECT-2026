'use client';

import React, { useState } from 'react';
import { AlertCircle, ShieldCheck, Check, Navigation, MapPin } from 'lucide-react';
import { ReliefData, Alert } from '@/types';
import { usePowerMode } from '@/lib/powerMode';

interface LiveSOSFeedProps {
  data: ReliefData;
  onVerify: (id: string) => void;
  onResolve: (id: string) => void;
  onNavigateToAlert?: (alert: Alert) => void;
}

export default function LiveSOSFeed({
  data,
  onVerify,
  onResolve,
  onNavigateToAlert,
}: LiveSOSFeedProps) {
  const { isPowerSaving } = usePowerMode();
  const [filter, setFilter] = useState<string>('all');

  const filteredAlerts =
    filter === 'all'
      ? data.alerts
      : data.alerts.filter((a) => a.need.toLowerCase() === filter.toLowerCase());

  return (
    <div className="pb-28">
      {/* Header */}
      <header className="px-6 pb-2 pt-3">
        <p
          className={`text-xs font-extrabold uppercase tracking-widest ${
            isPowerSaving ? 'text-red-400' : 'text-red-400'
          }`}
        >
          Live Mumbai Mesh Feed
        </p>
        <h1
          className={`mt-1 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-white' : 'text-white'
          }`}
        >
          Emergency SOS
        </h1>
        <p
          className={`mt-0.5 text-xs ${
            isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
          }`}
        >
          {data.alerts.length} verified citizen requests in sector
        </p>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto px-6 pb-2 pt-1 no-scrollbar">
        {['all', 'Medical', 'Trapped', 'Supplies', 'Evacuation'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              filter === item
                ? isPowerSaving
                  ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white'
                  : 'bg-red-600 text-white shadow-md'
                : isPowerSaving
                ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(8,19,12,0.96)] text-[#A8B4D0]'
                : 'border border-red-950 bg-white/5 text-stone-400 hover:text-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3 px-5 mt-2">
        {filteredAlerts.map((alert) => (
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
                className={`p-3 rounded-2xl flex-none ${
                  isPowerSaving
                    ? 'border border-[rgba(74,222,128,0.32)] text-red-400 bg-[rgba(11,24,15,0.97)]'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                <AlertCircle className="w-6 h-6" />
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <b className="text-sm font-bold">{alert.need} Urgently Needed</b>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        alert.status === 'verified'
                          ? isPowerSaving
                            ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white'
                            : 'bg-emerald-500/20 text-emerald-400'
                          : alert.status === 'resolved'
                          ? 'bg-blue-500/20 text-blue-400'
                          : isPowerSaving
                          ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(8,19,12,0.96)] text-[#A8B4D0]'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {alert.status}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
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
                </div>

                <p
                  className={`mt-2 text-xs leading-relaxed ${
                    isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
                  }`}
                >
                  {alert.details}
                </p>

                <div
                  className={`mt-3 flex items-center justify-between text-xs border-t pt-2.5 ${
                    isPowerSaving
                      ? 'border-[rgba(74,222,128,0.32)] text-[#A8B4D0]'
                      : 'border-white/5 text-stone-400'
                  }`}
                >
                  <span className="truncate flex items-center gap-1">
                    <MapPin className={`w-3.5 h-3.5 flex-none ${isPowerSaving ? 'text-red-400' : 'text-red-400'}`} />
                    {alert.citizenName} · {alert.area}
                  </span>
                  <span>
                    {new Date(alert.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Operator Actions & Real-Time Navigation */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  {/* Respond & Navigate to Victim on Tactical Map */}
                  <button
                    type="button"
                    onClick={() => onNavigateToAlert && onNavigateToAlert(alert)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      isPowerSaving
                        ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white hover:bg-[rgba(74,222,128,0.05)]'
                        : 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-950/40 hover:brightness-110'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Respond & Navigate
                  </button>

                  {alert.status === 'new' && (
                    <button
                      type="button"
                      onClick={() => onVerify(alert.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        isPowerSaving
                          ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white hover:bg-[rgba(74,222,128,0.05)] hover:text-white'
                          : 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/50'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verify
                    </button>
                  )}
                  {alert.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => onResolve(alert.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        isPowerSaving
                          ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(8,19,12,0.96)] text-[#A8B4D0] hover:text-white'
                          : 'bg-white/5 border border-white/10 text-stone-300 hover:bg-white/10'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="p-10 text-center border border-dashed border-neutral-800 rounded-3xl text-stone-500">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-stone-600" />
            <b className="text-sm block text-stone-400">No active alerts</b>
            <p className="text-xs mt-1">Incoming citizen alerts will appear here over BLE mesh.</p>
          </div>
        )}
      </div>
    </div>
  );
}
