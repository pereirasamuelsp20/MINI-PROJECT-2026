'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Shield,
  Navigation,
  Radio,
  MapPin,
  CheckCircle,
  AlertCircle,
  TriangleAlert,
  X,
  Compass,
} from 'lucide-react';
import { usePowerMode } from '@/lib/powerMode';
import PermissionModal from './PermissionModal';
import ReportHazardModal from './ReportHazardModal';
import { MapTarget } from './MapInner';
import { HazardMarker } from '@/types/hazards';
import { getStoredHazards } from '@/lib/hazards';
import { LocationEstimate } from '@/lib/pdr';
import { MUMBAI_CENTER } from '@/lib/mockData';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[460px] rounded-3xl bg-[#101515] border border-neutral-800 flex flex-col items-center justify-center text-center p-6 text-stone-400">
      <Radio className="w-10 h-10 text-red-500 animate-pulse mb-3" />
      <p className="text-sm font-bold uppercase tracking-wider text-white">
        Loading Mumbai Tactical MeshMap…
      </p>
      <p className="text-xs text-stone-400 mt-1">
        Acquiring local OpenStreetMap & PDR Kalman sensors
      </p>
    </div>
  ),
});

interface MapViewProps {
  isResponder?: boolean;
  activeTarget?: MapTarget | null;
  onClearTarget?: () => void;
}

export default function MapView({
  isResponder = false,
  activeTarget = null,
  onClearTarget,
}: MapViewProps) {
  const { isPowerSaving } = usePowerMode();
  const [selectedPoint, setSelectedPoint] = useState({
    name: 'Shivaji Park Relief Camp (Central Mumbai)',
    distance: 'Approx. 1.2 km · route estimate',
  });
  const [routeActive, setRouteActive] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showHazardModal, setShowHazardModal] = useState(false);
  const [permissionsActive, setPermissionsActive] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number]>(MUMBAI_CENTER);
  const [hazards, setHazards] = useState<HazardMarker[]>([]);
  const [livePdrEstimate, setLivePdrEstimate] = useState<LocationEstimate | null>(null);

  useEffect(() => {
    // Load hazards from local offline store
    setHazards(getStoredHazards());

    // Check if permissions previously granted
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('mesh_permissions_granted') === 'true';
      setPermissionsActive(granted);
      const savedLoc = localStorage.getItem('mesh_user_location');
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          setUserCoords([parsed.lat, parsed.lng]);
        } catch {
          // Fallback
        }
      }
      if (!granted) {
        setShowPermissionModal(true);
      }
    }
  }, []);

  const handlePermissionsCompleted = (coords?: [number, number]) => {
    setShowPermissionModal(false);
    setPermissionsActive(true);
    if (coords) {
      setUserCoords(coords);
    }
  };

  const handleHazardReported = (newHazard: HazardMarker) => {
    setHazards((prev) => [newHazard, ...prev]);
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-6 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <p
            className={`text-xs font-extrabold uppercase tracking-widest ${
              isPowerSaving
                ? 'text-[#00ff41]'
                : isResponder
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {isResponder ? 'Incident Command · Tactical Grid' : 'Evacuation & Safe Corridors'}
          </p>

          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isPowerSaving
                ? 'border-neutral-800 bg-black text-[#00ff41]'
                : isResponder
                ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300'
                : 'border-red-900/50 bg-red-950/30 text-red-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            Mumbai Sector
          </span>
        </div>

        <h1
          className={`mt-1.5 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-[#00ff41]' : 'text-white'
          }`}
        >
          {isResponder ? 'Responder MeshNav' : 'City MeshMap'}
        </h1>
        <p
          className={`mt-1 text-xs leading-relaxed ${
            isPowerSaving ? 'text-[#00ff41]/70' : 'text-stone-300'
          }`}
        >
          {isResponder
            ? 'Live GPS/PDR tracking, real-time SOS routes & obstacle avoidance'
            : 'Relief centers, water havens and offline relays in Mumbai'}
        </p>

        {/* State Bar & Quick Actions */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowPermissionModal(true)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              permissionsActive
                ? isPowerSaving
                  ? 'border-neutral-800 bg-black text-[#00ff41]'
                  : 'border-emerald-800/60 bg-emerald-950/20 text-emerald-400'
                : isPowerSaving
                ? 'border-[#00ff41] bg-black text-[#00ff41]'
                : 'border-red-700 bg-red-950/40 text-red-300 hover:brightness-110'
            }`}
          >
            {permissionsActive ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Sensors Active
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                Enable GPS & BLE
              </>
            )}
          </button>

          {/* Red Triangle Quick Action */}
          <button
            type="button"
            onClick={() => setShowHazardModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
              isPowerSaving
                ? 'border-[#00ff41] bg-black text-[#00ff41]'
                : 'border-red-800 bg-red-950/50 text-red-300 hover:bg-red-900/60'
            }`}
          >
            <TriangleAlert className="w-3.5 h-3.5 text-red-400" />
            Report Hazard
          </button>
        </div>
      </header>

      {/* Permission Modal */}
      {showPermissionModal && (
        <PermissionModal
          isOpen={showPermissionModal}
          onComplete={handlePermissionsCompleted}
        />
      )}

      {/* Hazard Report Modal */}
      {showHazardModal && (
        <ReportHazardModal
          isOpen={showHazardModal}
          onClose={() => setShowHazardModal(false)}
          userCoords={userCoords}
          onHazardReported={handleHazardReported}
        />
      )}

      {/* Active Navigation Target Banner (For Responder Navigating to SOS) */}
      {activeTarget && (
        <div
          className={`mx-5 mb-3 p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
            isPowerSaving
              ? 'bg-black border-[#00ff41] text-[#00ff41]'
              : 'bg-red-950/40 border-red-600/60 text-white shadow-[0_0_20px_rgba(255,38,61,0.2)]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping flex-none" />
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400 block">
                Active SOS Target
              </span>
              <b className="text-xs truncate block">{activeTarget.name}</b>
              <p className="text-[11px] text-stone-300 truncate">
                {activeTarget.need} · {activeTarget.details || 'Real-time navigation active'}
              </p>
            </div>
          </div>
          {onClearTarget && (
            <button
              type="button"
              onClick={onClearTarget}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-stone-300"
              title="Clear Target"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Map Viewport Container */}
      <div className="mx-5 h-[440px] relative rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl">
        {!showPermissionModal && (
          <MapInner
            userLocation={userCoords}
            activeTarget={activeTarget}
            safeRouteActive={routeActive}
            isResponder={isResponder}
            hazards={hazards}
            onOpenReportHazard={() => setShowHazardModal(true)}
            onSelectLocation={(name, distance) => {
              setSelectedPoint({ name, distance });
            }}
            onPdrUpdate={(est) => {
              setLivePdrEstimate(est);
              setUserCoords([est.latitude, est.longitude]);
            }}
          />
        )}
        {showPermissionModal && (
          <div className="w-full h-full flex items-center justify-center bg-[#101515] text-stone-500 text-sm">
            Grant permissions to load map
          </div>
        )}
      </div>

      {/* Selected Relief Point / Navigation Card */}
      <article
        className={`mx-5 mt-4 flex items-center gap-3.5 rounded-2xl border p-4 transition-colors ${
          isPowerSaving
            ? 'bg-black border-neutral-800 text-[#00ff41]'
            : 'bg-[#181111] border-red-950 text-white'
        }`}
      >
        <span
          className={`p-3 rounded-2xl ${
            isPowerSaving
              ? 'border border-neutral-800 bg-black text-[#00ff41]'
              : 'bg-red-500/15 text-red-400'
          }`}
        >
          {activeTarget ? <Navigation className="w-6 h-6 text-red-400" /> : <Shield className="w-6 h-6" />}
        </span>
        <span className="flex-1 min-w-0">
          <small
            className={`block text-xs font-bold uppercase tracking-wider ${
              isPowerSaving ? 'text-[#00ff41]/70' : 'text-red-400'
            }`}
          >
            {activeTarget ? 'En Route to Victim' : 'Nearest Safe Haven'}
          </small>
          <b
            className={`text-sm block truncate mt-0.5 ${
              isPowerSaving ? 'text-[#00ff41]' : 'text-white'
            }`}
          >
            {activeTarget ? activeTarget.name : selectedPoint.name}
          </b>
          <small
            className={`block text-xs mt-0.5 ${
              isPowerSaving ? 'text-[#00ff41]/60' : 'text-stone-400'
            }`}
          >
            {activeTarget ? 'Approx. 850m · 10 mins arrival' : selectedPoint.distance}
          </small>
        </span>
        <button
          type="button"
          onClick={() => setRouteActive(!routeActive)}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
            isPowerSaving
              ? 'border border-[#00ff41] bg-black text-[#00ff41] hover:bg-[#00ff41]/10'
              : 'border border-red-900 bg-red-500/15 text-red-400 hover:bg-red-500/25'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          {routeActive ? 'Active' : 'Safe route'}
        </button>
      </article>

      {/* Sensor / Dead Reckoning Status Bar */}
      <div
        className={`mx-5 mt-3 p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2.5 ${
          isPowerSaving
            ? 'bg-black border-neutral-800 text-[#00ff41]/80'
            : 'bg-black/40 border-white/5 text-stone-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-orange-400 flex-none" />
          <span>
            {livePdrEstimate?.isGpsLost
              ? `PDR Dead Reckoning active (${livePdrEstimate.stepCount} strides fused)`
              : 'GPS Locked · Real-time Kalman fusion'}
          </span>
        </div>
        <span className="text-[11px] font-bold text-stone-400">
          ±{livePdrEstimate?.accuracyMeters ?? 20}m uncertainty
        </span>
      </div>
    </div>
  );
}
