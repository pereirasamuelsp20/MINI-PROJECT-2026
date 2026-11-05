'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Navigation,
  Radio,
  MapPin,
  X,
  Compass,
  Search,
  Hospital,
  Tent,
} from 'lucide-react';
import { usePowerMode } from '@/lib/powerMode';
import PermissionModal from './PermissionModal';
import ReportHazardModal from './ReportHazardModal';
import { MapTarget } from './MapInner';
import { HazardMarker } from '@/types/hazards';
import { getStoredHazards } from '@/lib/hazards';
import { LocationEstimate } from '@/lib/pdr';
import { MUMBAI_CENTER } from '@/lib/mockData';
import {
  MUMBAI_SEARCHABLE_LOCATIONS,
  SearchableLocation,
  generateBestSafeRoute,
  calculateInstantSafeRoute,
  calculateSafeEvacuationRoute,
  SafeRouteResult,
  calculateHaversineDistance,
} from '@/lib/mumbaiSearch';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[460px] rounded-3xl bg-[#101515] border border-neutral-800 flex flex-col items-center justify-center text-center p-6 text-stone-400">
      <Radio className="w-10 h-10 text-red-500 animate-pulse mb-3" />
      <p className="text-sm font-bold uppercase tracking-wider text-white">
        Loading Mumbai Tactical MeshMap…
      </p>
      <p className="text-xs text-stone-400 mt-1">
        Acquiring hardware GPS & local OpenStreetMap tiles
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

  // Permissions & Hardware GPS state
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionsActive, setPermissionsActive] = useState(false);

  // Staged User Coordinates (Only updates state when moved > 10m to avoid re-rendering 1000 times)
  const [userCoords, setUserCoords] = useState<[number, number]>(MUMBAI_CENTER);
  const lastCoordsRef = useRef<[number, number]>(MUMBAI_CENTER);

  const [hasRealGpsLock, setHasRealGpsLock] = useState<boolean>(false);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number>(15);

  // Hazards state
  const [hazards, setHazards] = useState<HazardMarker[]>([]);
  const [showHazardModal, setShowHazardModal] = useState(false);
  const [hazardTargetCoords, setHazardTargetCoords] = useState<[number, number]>(MUMBAI_CENTER);

  // Destination Search & Safe Routing State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<SearchableLocation | null>(null);
  const [safeRouteResult, setSafeRouteResult] = useState<SafeRouteResult | null>(null);

  // 1. Initial Load & Permissions
  useEffect(() => {
    setHazards(getStoredHazards());

    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('mesh_permissions_granted') === 'true';
      setPermissionsActive(granted);

      // Attempt immediate accurate hardware GPS fix
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const exactCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            lastCoordsRef.current = exactCoords;
            setUserCoords(exactCoords);
            setHazardTargetCoords(exactCoords);
            setHasRealGpsLock(true);
            setGpsAccuracyMeters(Math.round(pos.coords.accuracy));

            localStorage.setItem(
              'mesh_user_location',
              JSON.stringify({ lat: exactCoords[0], lng: exactCoords[1] })
            );
          },
          () => {
            const savedLoc = localStorage.getItem('mesh_user_location');
            if (savedLoc) {
              try {
                const parsed = JSON.parse(savedLoc);
                lastCoordsRef.current = [parsed.lat, parsed.lng];
                setUserCoords([parsed.lat, parsed.lng]);
                setHazardTargetCoords([parsed.lat, parsed.lng]);
              } catch {
                // Default
              }
            }
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      }

      if (!granted) {
        setShowPermissionModal(true);
      }
    }
  }, []);

  // 2. Hardware GPS Watcher with Debounced Coordinate Updates (>10m filter to eliminate unnecessary re-renders)
  useEffect(() => {
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator && permissionsActive) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy);

          setHasRealGpsLock(true);
          setGpsAccuracyMeters(acc);

          // Only trigger React state update if user moved by at least 10 meters!
          const distMoved = calculateHaversineDistance(
            lastCoordsRef.current[0],
            lastCoordsRef.current[1],
            newLat,
            newLng
          );

          if (distMoved >= 10) {
            lastCoordsRef.current = [newLat, newLng];
            setUserCoords([newLat, newLng]);
          }
        },
        () => {
          setHasRealGpsLock(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [permissionsActive]);

  // 3. Compute Safe Street Route (Instant offline graph + Async OSRM foot routing)
  useEffect(() => {
    let isCancelled = false;
    let destCoords: [number, number];

    if (activeTarget) {
      destCoords = [activeTarget.latitude, activeTarget.longitude];
    } else if (selectedDestination) {
      destCoords = [selectedDestination.latitude, selectedDestination.longitude];
    } else {
      const defaultShelter = MUMBAI_SEARCHABLE_LOCATIONS[0];
      destCoords = [defaultShelter.latitude, defaultShelter.longitude];
    }

    // 1. Instant calculation via Mumbai street network graph (A*)
    const instantRoute = calculateInstantSafeRoute(userCoords, destCoords, hazards);
    setSafeRouteResult(instantRoute);

    // 2. High-precision async upgrade via OSRM pedestrian API with hazard avoidance
    calculateSafeEvacuationRoute(userCoords, destCoords, hazards).then((refinedRoute) => {
      if (!isCancelled && refinedRoute && refinedRoute.waypoints.length > 1) {
        setSafeRouteResult(refinedRoute);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [userCoords, selectedDestination, activeTarget, hazards]);

  const handlePermissionsCompleted = (coords?: [number, number]) => {
    setShowPermissionModal(false);
    setPermissionsActive(true);
    if (coords) {
      lastCoordsRef.current = coords;
      setUserCoords(coords);
      setHazardTargetCoords(coords);
      setHasRealGpsLock(true);
    }
  };

  const handleHazardReported = (newHazard: HazardMarker) => {
    setHazards((prev) => [newHazard, ...prev]);
  };

  const handleOpenReportAtCoords = useCallback((coords: [number, number]) => {
    setHazardTargetCoords(coords);
    setShowHazardModal(true);
  }, []);

  // Search Results filtering
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return MUMBAI_SEARCHABLE_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.description.toLowerCase().includes(q) ||
        (loc.badge && loc.badge.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [searchQuery]);

  const handleSelectLocationFromSearch = (loc: SearchableLocation) => {
    setSelectedDestination(loc);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleClearDestination = () => {
    setSelectedDestination(null);
    if (onClearTarget) onClearTarget();
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="px-6 pb-2 pt-3">
        <div className="flex items-center justify-between">
          <p
            className={`text-xs font-extrabold uppercase tracking-widest ${
              isPowerSaving
                ? 'text-white'
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
                ? 'border-[rgba(74,222,128,0.32)] bg-[rgba(8,19,12,0.96)] text-white'
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
          className={`mt-1 text-2xl font-extrabold tracking-tight ${
            isPowerSaving ? 'text-white' : 'text-white'
          }`}
        >
          {isResponder ? 'Responder MeshNav' : 'City MeshMap'}
        </h1>
        <p
          className={`mt-0.5 text-xs leading-relaxed ${
            isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-300'
          }`}
        >
          {isResponder
            ? 'Live GPS tracking, real-time SOS navigation & obstacle avoidance'
            : 'Find safe havens, report flooded roads & generate safe corridors'}
        </p>
      </header>

      {/* SEARCH BAR (Top of Map with Safe Route Generation) */}
      <div className="px-5 mb-2.5 relative z-30">
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-3.5 top-3.5 ${isPowerSaving ? 'text-white' : 'text-stone-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            placeholder="Search safe havens, relief camps, hospitals in Mumbai…"
            className={`w-full rounded-2xl pl-10 pr-9 py-2.5 text-xs outline-none border transition-all ${
              isPowerSaving
                ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-white placeholder-[#A8B4D0] focus:border-[rgba(74,222,128,0.32)]'
                : 'bg-black/70 border-white/10 text-white placeholder-stone-400 focus:border-red-500 shadow-lg'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-3 top-3 text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchResults.length > 0 && (
          <div
            className={`absolute left-5 right-5 mt-1.5 rounded-2xl border p-2 shadow-2xl z-50 max-h-64 overflow-y-auto ${
              isPowerSaving
                ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-white'
                : 'bg-[#150e0e] border-[#54302c] text-white'
            }`}
          >
            {searchResults.map((loc) => (
              <div
                key={loc.id}
                onClick={() => handleSelectLocationFromSearch(loc)}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isPowerSaving ? 'hover:bg-[rgba(74,222,128,0.05)]' : 'hover:bg-white/10'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <b className="block text-xs font-bold truncate">{loc.name}</b>
                  <p className={`text-[11px] truncate mt-0.5 ${isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'}`}>
                    {loc.description}
                  </p>
                </div>
                {loc.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-none ${
                      loc.category === 'hospital'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : loc.category === 'safe_zone'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {loc.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
          userCoords={hazardTargetCoords}
          onHazardReported={handleHazardReported}
        />
      )}

      {/* Map Viewport Container */}
      <div className={`mx-5 h-[430px] relative rounded-3xl overflow-hidden border shadow-2xl ${
        isPowerSaving ? 'border-[rgba(74,222,128,0.32)]' : 'border-neutral-800'
      }`}>
        {!showPermissionModal && (
          <MapInner
            userLocation={userCoords}
            activeTarget={activeTarget}
            destinationLocation={
              selectedDestination
                ? [selectedDestination.latitude, selectedDestination.longitude]
                : null
            }
            destinationName={selectedDestination?.name || activeTarget?.name || null}
            safeRouteWaypoints={safeRouteResult?.waypoints || null}
            safeRouteActive={true}
            isResponder={isResponder}
            hazards={hazards}
            onHazardPlaced={handleHazardReported}
            onOpenReportHazardAt={handleOpenReportAtCoords}
            onSelectLocation={(name) => {
              const matched = MUMBAI_SEARCHABLE_LOCATIONS.find((l) => l.name === name);
              if (matched) setSelectedDestination(matched);
            }}
          />
        )}
        {showPermissionModal && (
          <div className="w-full h-full flex items-center justify-center bg-[#101515] text-stone-500 text-sm">
            Grant permissions to load map
          </div>
        )}
      </div>

      {/* DYNAMIC SAFE ROUTE & NAVIGATION CARD */}
      <article
        className={`mx-5 mt-3 rounded-2xl border p-4 transition-colors ${
          isPowerSaving
            ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] backdrop-blur-sm text-white'
            : 'bg-[#181111] border-red-950 text-white'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <span
            className={`p-3 rounded-2xl flex-none ${
              isPowerSaving
                ? 'border border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-red-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {activeTarget ? (
              <Navigation className="w-6 h-6 text-red-400" />
            ) : selectedDestination?.category === 'hospital' ? (
              <Hospital className="w-6 h-6 text-rose-400" />
            ) : (
              <Tent className="w-6 h-6 text-emerald-400" />
            )}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <small
                className={`text-xs font-bold uppercase tracking-wider ${
                  isPowerSaving ? 'text-[#A8B4D0]' : 'text-red-400'
                }`}
              >
                {activeTarget
                  ? 'SOS Emergency Route'
                  : selectedDestination
                  ? `Safe Corridor to ${selectedDestination.badge || 'Destination'}`
                  : 'Nearest Safe Haven'}
              </small>

              {(selectedDestination || activeTarget) && (
                <button
                  type="button"
                  onClick={handleClearDestination}
                  className="text-stone-400 hover:text-white p-1"
                  title="Clear Route"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <b
              className={`text-sm block truncate mt-0.5 ${
                isPowerSaving ? 'text-white' : 'text-white'
              }`}
            >
              {activeTarget
                ? activeTarget.name
                : selectedDestination
                ? selectedDestination.name
                : 'Shivaji Park Relief Camp (Central Mumbai)'}
            </b>

            {/* Distance & Time Details */}
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className={`font-bold ${isPowerSaving ? 'text-white' : 'text-stone-200'}`}>
                📍 {safeRouteResult?.distanceFormatted || 'Approx. 1.2 km'}
              </span>
              <span className={isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'}>
                ⏱️ {safeRouteResult?.timeFormatted || '15 mins walk'}
              </span>
            </div>

            {/* Hazard Detour & Safety Corridor Status */}
            <p
              className={`mt-2 text-[11px] font-semibold flex items-center gap-1.5 ${
                safeRouteResult?.isRerouted
                  ? 'text-amber-400'
                  : isPowerSaving
                  ? 'text-[#A8B4D0]'
                  : 'text-emerald-400'
              }`}
            >
              {safeRouteResult?.statusText || '✅ 100% Clear Safe Evacuation Corridor'}
            </p>
          </div>
        </div>
      </article>

      {/* SENSOR / LOCATION STATUS BAR */}
      <div
        className={`mx-5 mt-2.5 p-3 rounded-2xl border text-xs flex items-center justify-between gap-2.5 ${
          isPowerSaving
            ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] backdrop-blur-sm text-[#A8B4D0]'
            : 'bg-black/40 border-white/5 text-stone-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-orange-400 flex-none" />
          <span>
            {hasRealGpsLock
              ? 'GPS Hardware Lock Active (Satellite Direct)'
              : 'PDR Dead Reckoning (Sensor Fusion Active)'}
          </span>
        </div>
        <span className={`text-[11px] font-bold ${isPowerSaving ? 'text-[#A8B4D0]' : 'text-stone-400'}`}>
          ±{gpsAccuracyMeters}m
        </span>
      </div>
    </div>
  );
}
