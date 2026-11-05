'use client';

import React, { useState } from 'react';
import { MapPin, Radio, Shield, CheckCircle2 } from 'lucide-react';
import { usePowerMode } from '@/lib/powerMode';

interface PermissionModalProps {
  isOpen: boolean;
  onComplete: (coords?: [number, number]) => void;
}

export default function PermissionModal({ isOpen, onComplete }: PermissionModalProps) {
  const { isPowerSaving } = usePowerMode();
  const [requesting, setRequesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAllowPermissions = async () => {
    setRequesting(true);
    setStatusMessage('Requesting GPS & BLE permissions...');

    let detectedCoords: [number, number] | undefined = undefined;

    // 1. Geolocation Request
    if ('geolocation' in navigator) {
      try {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              detectedCoords = [pos.coords.latitude, pos.coords.longitude];
              localStorage.setItem(
                'mesh_user_location',
                JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
              );
              resolve();
            },
            () => {
              // User denied or error - fallback to Mumbai
              resolve();
            },
            { timeout: 8000, enableHighAccuracy: true }
          );
        });
      } catch {
        // Fallback
      }
    }

    // 2. Bluetooth Availability check
    if ('bluetooth' in navigator) {
      try {
        // Web Bluetooth check if available
        const nav = navigator as unknown as { bluetooth?: { getAvailability?: () => Promise<boolean> } };
        if (nav.bluetooth?.getAvailability) {
          await nav.bluetooth.getAvailability();
        }
      } catch {
        // Ignore
      }
    }

    localStorage.setItem('mesh_permissions_granted', 'true');
    setStatusMessage('Permissions active. Activating Mumbai sector...');
    setTimeout(() => {
      setRequesting(false);
      onComplete(detectedCoords);
    }, 600);
  };

  const handleSkip = () => {
    localStorage.setItem('mesh_permissions_granted', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-sm rounded-3xl border p-6 transition-all shadow-2xl ${
          isPowerSaving
            ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-white'
            : 'bg-[#120d0d] border-[#54302c] text-white'
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-3 rounded-2xl ${
              isPowerSaving ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-red-400' : 'bg-red-500/15 text-red-400'
            }`}
          >
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold">Permissions Required</h3>
            <p
              className={`text-xs ${
                isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'
              }`}
            >
              Essential for offline disaster routing
            </p>
          </div>
        </div>

        <div className="space-y-4 my-5">
          {/* Location Permission Note */}
          <div
            className={`flex items-start gap-3 p-3.5 rounded-2xl border ${
              isPowerSaving ? 'border-[rgba(74,222,128,0.32)] bg-[rgba(8,19,12,0.96)]' : 'border-white/5 bg-white/5'
            }`}
          >
            <MapPin className={`w-5 h-5 flex-none mt-0.5 ${isPowerSaving ? 'text-red-400' : 'text-red-400'}`} />
            <div className="text-xs">
              <strong className="block font-semibold">Location Access</strong>
              <p
                className={`mt-0.5 leading-relaxed ${
                  isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'
                }`}
              >
                Calculates your nearest safe haven in Mumbai and plots safe evacuation routes. Stored strictly on device.
              </p>
            </div>
          </div>

          {/* Bluetooth Permission Note */}
          <div
            className={`flex items-start gap-3 p-3.5 rounded-2xl border ${
              isPowerSaving ? 'border-[rgba(74,222,128,0.32)] bg-[rgba(8,19,12,0.96)]' : 'border-white/5 bg-white/5'
            }`}
          >
            <Radio className={`w-5 h-5 flex-none mt-0.5 ${isPowerSaving ? 'text-red-400' : 'text-red-400'}`} />
            <div className="text-xs">
              <strong className="block font-semibold">Bluetooth (BLE) Mesh</strong>
              <p
                className={`mt-0.5 leading-relaxed ${
                  isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'
                }`}
              >
                Sends store-and-forward SOS messages and peer chats without cellular or internet towers.
              </p>
            </div>
          </div>
        </div>

        {statusMessage && (
          <p
            className={`text-xs text-center mb-3 animate-pulse flex items-center justify-center gap-1.5 ${
              isPowerSaving ? 'text-white' : 'text-emerald-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {statusMessage}
          </p>
        )}

        <div className="space-y-2 mt-5">
          <button
            type="button"
            disabled={requesting}
            onClick={handleAllowPermissions}
            className={`w-full py-3.5 px-5 rounded-2xl text-sm font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isPowerSaving
                ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white hover:bg-[rgba(74,222,128,0.05)]'
                : 'bg-gradient-to-r from-[#ff6754] via-[#ff263d] to-[#bd1230] text-white shadow-lg shadow-red-950/40 hover:brightness-110'
            }`}
          >
            {requesting ? 'Granting...' : 'Allow Location & Bluetooth'}
          </button>

          <button
            type="button"
            disabled={requesting}
            onClick={handleSkip}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-center transition-all ${
              isPowerSaving ? 'text-[#A8B4D0] hover:text-white' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Use Default (Mumbai Sector)
          </button>
        </div>
      </div>
    </div>
  );
}
