'use client';

import React, { useState } from 'react';
import { TriangleAlert, X, Send, Radio, MapPin } from 'lucide-react';
import { HazardType, HAZARD_INFO, HazardMarker } from '@/types/hazards';
import { createHazardReport } from '@/lib/hazards';
import { usePowerMode } from '@/lib/powerMode';

interface ReportHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoords: [number, number];
  onHazardReported: (hazard: HazardMarker) => void;
}

export default function ReportHazardModal({
  isOpen,
  onClose,
  userCoords,
  onHazardReported,
}: ReportHazardModalProps) {
  const { isPowerSaving } = usePowerMode();
  const [selectedType, setSelectedType] = useState<HazardType>('flooded');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('high');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const hazard = createHazardReport({
        type: selectedType,
        latitude: userCoords[0],
        longitude: userCoords[1],
        accuracyMeters: 20,
        description: description || HAZARD_INFO[selectedType].description,
        severity,
        reportedBy: 'MESH-NODE-LOCAL',
      });

      onHazardReported(hazard);
      onClose();
    } catch {
      // safe fallback
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl transition-all my-auto ${
          isPowerSaving
            ? 'bg-black border-[rgba(0,255,65,0.25)] text-[#00ff41]'
            : 'bg-[#150d0d] border-red-900/80 text-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isPowerSaving ? 'border-[rgba(0,255,65,0.15)]' : 'border-white/10'}`}>
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isPowerSaving
                  ? 'border border-[rgba(0,255,65,0.3)] bg-[rgba(0,255,65,0.1)] text-[#00ff41]'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              <TriangleAlert className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider">
                Report Route Hazard
              </h3>
              <p
                className={`text-[11px] ${
                  isPowerSaving ? 'text-[rgba(0,255,65,0.7)]' : 'text-stone-400'
                }`}
              >
                Broadcasts instantly via BLE to all responders & peers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg ${
              isPowerSaving
                ? 'text-[rgba(0,255,65,0.6)] hover:text-[#00ff41]'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Hazard Type Selector */}
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                isPowerSaving ? 'text-[rgba(0,255,65,0.75)]' : 'text-stone-300'
              }`}
            >
              Select Obstruction Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(HAZARD_INFO) as HazardType[]).map((type) => {
                const info = HAZARD_INFO[type];
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 text-xs transition-all ${
                      isSelected
                        ? isPowerSaving
                          ? 'border-[#00ff41] bg-[rgba(0,255,65,0.15)] text-[#00ff41] font-bold'
                          : 'border-red-500 bg-red-600/20 text-white font-bold shadow-[0_0_12px_rgba(255,38,61,0.25)]'
                        : isPowerSaving
                        ? 'border-[rgba(0,255,65,0.18)] bg-[rgba(0,255,65,0.06)] text-[rgba(0,255,65,0.65)]'
                        : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base">{info.emoji}</span>
                    <span className="truncate">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isPowerSaving ? 'text-[rgba(0,255,65,0.75)]' : 'text-stone-300'
              }`}
            >
              Severity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSeverity(lvl)}
                  className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    severity === lvl
                      ? lvl === 'high'
                        ? 'bg-red-600 border-red-500 text-white'
                        : lvl === 'medium'
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-emerald-600 border-emerald-500 text-white'
                      : isPowerSaving
                      ? 'border-[rgba(0,255,65,0.18)] bg-[rgba(0,255,65,0.06)] text-[rgba(0,255,65,0.5)]'
                      : 'border-white/10 bg-white/5 text-stone-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isPowerSaving ? 'text-[rgba(0,255,65,0.75)]' : 'text-stone-300'
              }`}
            >
              Location Note (Landmarks / Depth)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Flooded 3 feet near Dadar station circle, impassable for light vehicles..."
              rows={2}
              className={`w-full rounded-2xl border p-3 text-xs outline-none transition-colors ${
                isPowerSaving
                  ? 'bg-[rgba(0,255,65,0.04)] border-[rgba(0,255,65,0.2)] text-[#00ff41] placeholder-[rgba(0,255,65,0.4)] focus:border-[#00ff41]'
                  : 'bg-black/40 border-red-950 text-white placeholder-stone-600 focus:border-red-500'
              }`}
            />
          </div>

          {/* GPS Coordinates Notice */}
          <div
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] ${
              isPowerSaving
                ? 'border-[rgba(0,255,65,0.18)] bg-[rgba(0,255,65,0.06)] text-[rgba(0,255,65,0.7)]'
                : 'border-white/5 bg-white/5 text-stone-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-red-400 flex-none" />
            <span className="truncate">
              Pinning at {userCoords[0].toFixed(4)}°N, {userCoords[1].toFixed(4)}°E (Mumbai)
            </span>
          </div>

          {/* Offline BLE Transmission Badge */}
          <div
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] ${
              isPowerSaving
                ? 'border-[rgba(0,255,65,0.2)] bg-[rgba(0,255,65,0.06)] text-[rgba(0,255,65,0.85)]'
                : 'border-emerald-950/60 bg-emerald-950/20 text-emerald-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse flex-none" />
            <span>Encapsulated as BLE mesh packet. No internet required.</span>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 px-4 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                isPowerSaving
                  ? 'border-2 border-[#00ff41] bg-[rgba(0,255,65,0.15)] text-[#00ff41] hover:bg-[rgba(0,255,65,0.25)]'
                  : 'bg-gradient-to-r from-[#ff5e4f] via-[#ff263d] to-[#bd1230] text-white shadow-lg shadow-red-950/40 hover:brightness-110'
              }`}
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Broadcasting to Mesh…' : 'Broadcast Hazard via BLE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
