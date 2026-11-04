'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultLocations, MUMBAI_BOUNDS, MUMBAI_CENTER } from '@/lib/mockData';
import { usePowerMode } from '@/lib/powerMode';
import { HazardMarker, HAZARD_INFO } from '@/types/hazards';
import { PDRKalmanTracker, LocationEstimate } from '@/lib/pdr';
import { TriangleAlert, Footprints, Crosshair, Navigation, MapPin } from 'lucide-react';

export interface MapTarget {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  need?: string;
  details?: string;
  priority?: string;
}

interface MapInnerProps {
  userLocation?: [number, number];
  activeTarget?: MapTarget | null;
  destinationLocation?: [number, number] | null;
  destinationName?: string | null;
  safeRouteWaypoints?: [number, number][] | null;
  onSelectLocation?: (name: string, distance: string) => void;
  safeRouteActive?: boolean;
  onOpenReportHazard?: () => void;
  onOpenReportHazardAt?: (coords: [number, number]) => void;
  isResponder?: boolean;
  hazards?: HazardMarker[];
  onConfirmHazard?: (id: string) => void;
  onPdrUpdate?: (estimate: LocationEstimate) => void;
}

export default function MapInner({
  userLocation = MUMBAI_CENTER,
  activeTarget = null,
  destinationLocation = null,
  destinationName = null,
  safeRouteWaypoints = null,
  onSelectLocation,
  safeRouteActive = true,
  onOpenReportHazard,
  onOpenReportHazardAt,
  isResponder = false,
  hazards = [],
  onConfirmHazard,
  onPdrUpdate,
}: MapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer references for lag-free incremental updates
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const reliefLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const trackerRef = useRef<PDRKalmanTracker | null>(null);
  const [pdrStatus, setPdrStatus] = useState<LocationEstimate | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState<boolean>(true);
  const [recalibrating, setRecalibrating] = useState<boolean>(false);
  const [tappedLocation, setTappedLocation] = useState<[number, number] | null>(null);

  const { isPowerSaving } = usePowerMode();

  // Valid coordinate check
  const currentUserPos = useRef<[number, number]>(userLocation);

  // 1. Initialize PDR Kalman Tracker (Only uses PDR when GPS is lost)
  useEffect(() => {
    const tracker = new PDRKalmanTracker(userLocation[0], userLocation[1]);
    trackerRef.current = tracker;
    tracker.start();

    // Listen to fused/GPS updates
    const unsubscribe = tracker.onUpdate((estimate) => {
      setPdrStatus(estimate);
      currentUserPos.current = [estimate.latitude, estimate.longitude];

      if (onPdrUpdate) onPdrUpdate(estimate);

      // Smoothly update user marker & uncertainty circle without jerking the viewport
      if (userMarkerRef.current && accuracyCircleRef.current) {
        const newPos = L.latLng(estimate.latitude, estimate.longitude);
        userMarkerRef.current.setLatLng(newPos);
        accuracyCircleRef.current.setLatLng(newPos);
        accuracyCircleRef.current.setRadius(estimate.accuracyMeters);

        // Visual distinction: Orange for PDR dead reckoning, Green/Red for pure GPS
        if (estimate.isGpsLost) {
          accuracyCircleRef.current.setStyle({
            color: '#f59e0b',
            fillColor: '#f59e0b',
            dashArray: '4, 4',
          });
        } else {
          accuracyCircleRef.current.setStyle({
            color: isPowerSaving ? '#00ff41' : '#ff263d',
            fillColor: isPowerSaving ? '#00ff41' : '#ff263d',
            dashArray: '5, 5',
          });
        }
      }

      // ONLY pan map if user hasn't touched/dragged the map
      if (isFollowingUser && mapInstanceRef.current) {
        mapInstanceRef.current.panTo([estimate.latitude, estimate.longitude], {
          animate: true,
          duration: 0.5,
        });
      }
    });

    // Native Browser Geolocation Watch (High Accuracy Hardware GPS)
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          tracker.updateGPS(
            pos.coords.latitude,
            pos.coords.longitude,
            Math.round(pos.coords.accuracy)
          );
        },
        (err) => {
          console.warn('GPS Signal degraded, relying on local PDR:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }

    return () => {
      unsubscribe();
      tracker.stop();
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isFollowingUser, isPowerSaving]);

  // 2. Initialize Leaflet Map ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent recreation

    const initialZoom = activeTarget ? 15 : 14;

    const map = L.map(mapContainerRef.current, {
      center: userLocation,
      zoom: initialZoom,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: MUMBAI_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Detect user interactions: stop snapping back to user location when user explores the map
    map.on('dragstart', () => {
      setIsFollowingUser(false);
    });
    map.on('zoomstart', () => {
      setIsFollowingUser(false);
    });

    // MAP CLICK: Allow accurate pin placement anywhere on map!
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(5));
      const lng = parseFloat(e.latlng.lng.toFixed(5));
      setTappedLocation([lat, lng]);

      // Pop-up prompt to report hazard at tapped location
      L.popup()
        .setLatLng(e.latlng)
        .setContent(`
          <div style="font-family: sans-serif; font-size: 12px; color: #111; padding: 2px;">
            <b style="color: #ff263d; font-size: 13px;">📍 Spot Selected</b>
            <p style="margin: 4px 0 6px; font-size: 11px; color: #555;">${lat}°N, ${lng}°E</p>
            <button id="btn-report-at-tap" style="
              background: #ff263d;
              color: white;
              border: none;
              border-radius: 8px;
              padding: 5px 10px;
              font-size: 11px;
              font-weight: bold;
              cursor: pointer;
              width: 100%;
            ">Report Hazard Here</button>
          </div>
        `)
        .openOn(map);

      setTimeout(() => {
        const btn = document.getElementById('btn-report-at-tap');
        if (btn) {
          btn.onclick = () => {
            map.closePopup();
            if (onOpenReportHazardAt) {
              onOpenReportHazardAt([lat, lng]);
            } else if (onOpenReportHazard) {
              onOpenReportHazard();
            }
          };
        }
      }, 50);
    });

    // OSM Tiles via direct or local proxy
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const tileUrl = isLocalhost
      ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      : '/api/map-tile/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // Zoom controls at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initialize layer groups for relief and hazards
    const reliefGroup = L.layerGroup().addTo(map);
    reliefLayerGroupRef.current = reliefGroup;

    const hazardsGroup = L.layerGroup().addTo(map);
    hazardsLayerGroupRef.current = hazardsGroup;

    // Create user marker
    const userMarkerIcon = L.divIcon({
      className: 'user-marker',
      html: `
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #ffffff;
          border: 4px solid ${isPowerSaving ? '#00ff41' : '#ff263d'};
          box-shadow: 0 0 0 8px ${isPowerSaving ? 'rgba(0,255,65,0.25)' : 'rgba(255,38,61,0.25)'};
          transform: translate(-50%, -50%);
        "></div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const userMarker = L.marker(userLocation, { icon: userMarkerIcon }).addTo(map);
    userMarkerRef.current = userMarker;

    const accuracyCircle = L.circle(userLocation, {
      radius: 25,
      color: isPowerSaving ? '#00ff41' : '#ff263d',
      fillColor: isPowerSaving ? '#00ff41' : '#ff263d',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '5, 5',
    }).addTo(map);
    accuracyCircleRef.current = accuracyCircle;

    // Populate static Relief Locations
    defaultLocations.forEach((loc) => {
      let bgColor = '#ff263d';
      let symbol = '🛡️';
      let label = 'Relief Camp';

      if (loc.type === 'safe_zone') {
        bgColor = '#00d294';
        symbol = '⛺';
        label = 'Safe Haven';
      } else if (loc.type === 'relay') {
        bgColor = '#ff8b1a';
        symbol = '📶';
        label = 'Mesh Relay';
      }

      const icon = L.divIcon({
        className: 'custom-mesh-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: ${bgColor}; color: white; padding: 4px 8px; border-radius: 9px; font-size: 11px; font-weight: 800; box-shadow: 0 2px 10px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.7); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
              <span>${symbol}</span>
              <span>${label}</span>
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${bgColor};"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const m = L.marker([loc.latitude, loc.longitude], { icon }).addTo(reliefGroup);
      m.bindPopup(`
        <div style="color: #111; font-family: sans-serif; font-size: 13px; line-height: 1.4; padding: 2px;">
          <b style="font-size: 14px; color: #111;">${loc.name}</b>
          ${loc.capacity ? `<p style="margin: 4px 0 2px;"><b>Capacity:</b> ${loc.capacity}</p>` : ''}
          ${loc.supplies ? `<p style="margin: 2px 0;"><b>Supplies:</b> ${loc.supplies.join(', ')}</p>` : ''}
        </div>
      `);

      m.on('click', () => {
        if (onSelectLocation) {
          onSelectLocation(loc.name, loc.distanceEstimate || 'Approx. 1.2 km');
        }
      });
    });

    // Invalidate size once container mounts
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Incremental, Lag-Free Hazard Synchronization
  useEffect(() => {
    if (!hazardsLayerGroupRef.current) return;
    const group = hazardsLayerGroupRef.current;
    group.clearLayers();

    hazards.forEach((hazard) => {
      const info = HAZARD_INFO[hazard.type] || {
        emoji: '⚠️',
        label: hazard.type,
        color: '#ef4444',
      };

      const hazardIcon = L.divIcon({
        className: 'hazard-mesh-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: ${info.color}; color: white; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; box-shadow: 0 2px 10px rgba(0,0,0,0.5); border: 2px solid #ffffff; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
              <span>${info.emoji}</span>
              <span>${info.label}</span>
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${info.color};"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const marker = L.marker([hazard.latitude, hazard.longitude], { icon: hazardIcon }).addTo(group);
      marker.bindPopup(`
        <div style="color: #111; font-family: sans-serif; font-size: 12px; max-width: 210px; padding: 2px;">
          <b style="color: ${info.color}; font-size: 13px;">${info.emoji} ${info.label}</b>
          <p style="margin: 4px 0; color: #333; line-height: 1.3;">${hazard.description}</p>
          <div style="margin-top: 6px; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 4px;">
            <span>Severity: <b>${hazard.severity.toUpperCase()}</b></span> · 
            <span>Reports: <b>${hazard.confirmCount}</b></span>
          </div>
          <p style="margin: 4px 0 0; color: #059669; font-size: 10px; font-weight: bold;">
            Synchronized via BLE Mesh
          </p>
        </div>
      `);

      // Exclusion radius
      L.circle([hazard.latitude, hazard.longitude], {
        radius: Math.max(hazard.accuracyMeters * 2, 40),
        color: info.color,
        fillColor: info.color,
        fillOpacity: 0.18,
        weight: 1,
        dashArray: '3, 3',
      }).addTo(group);
    });
  }, [hazards]);

  // 4. Update Navigation Route & Destination Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear previous route polyline
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    // Clear previous destination marker
    if (destinationMarkerRef.current) {
      map.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    // If destination exists, drop destination marker
    if (destinationLocation) {
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: #00d294; color: white; padding: 4px 8px; border-radius: 9px; font-size: 11px; font-weight: 800; box-shadow: 0 2px 12px rgba(0,210,148,0.5); border: 2px solid #ffffff; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
              <span>🏁</span>
              <span>${destinationName || 'Destination'}</span>
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #00d294;"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const dMarker = L.marker(destinationLocation, { icon: destIcon }).addTo(map);
      destinationMarkerRef.current = dMarker;
    }

    // Render Safe Waypoints Route
    if (safeRouteActive && safeRouteWaypoints && safeRouteWaypoints.length >= 2) {
      const polyline = L.polyline(safeRouteWaypoints, {
        color: activeTarget ? '#ff263d' : isPowerSaving ? '#00ff41' : '#00d294',
        weight: 5,
        opacity: 0.9,
        dashArray: '7, 7',
      }).addTo(map);

      routePolylineRef.current = polyline;

      // Fit bounds to show route when destination first set
      try {
        const bounds = L.latLngBounds(safeRouteWaypoints);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch {
        // safety
      }
    }
  }, [safeRouteWaypoints, destinationLocation, destinationName, safeRouteActive, activeTarget, isPowerSaving]);

  // 5. Google Maps Style "Recalibrate / My Location" Handler
  const handleRecalibrate = useCallback(() => {
    setRecalibrating(true);
    setIsFollowingUser(true);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const freshLat = pos.coords.latitude;
          const freshLng = pos.coords.longitude;
          currentUserPos.current = [freshLat, freshLng];

          if (trackerRef.current) {
            trackerRef.current.updateGPS(freshLat, freshLng, Math.round(pos.coords.accuracy));
          }

          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([freshLat, freshLng], 16, {
              animate: true,
              duration: 0.8,
            });
          }
          setTimeout(() => setRecalibrating(false), 800);
        },
        () => {
          // Fallback to current estimated position
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(currentUserPos.current, 16, {
              animate: true,
              duration: 0.8,
            });
          }
          setRecalibrating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo(currentUserPos.current, 16, {
          animate: true,
          duration: 0.8,
        });
      }
      setRecalibrating(false);
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${
          isPowerSaving ? 'filter invert brightness-90' : ''
        }`}
      />

      {/* Floating Status / Sensor Badge (Top Left) */}
      <div className="absolute top-3 left-3 z-[400] pointer-events-none">
        <div
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold backdrop-blur-md shadow-md flex items-center gap-2 ${
            pdrStatus?.isGpsLost
              ? 'bg-amber-950/80 border-amber-600/70 text-amber-300'
              : isPowerSaving
              ? 'bg-black/90 border-[#00ff41]/30 text-[#00ff41]'
              : 'bg-black/80 border-emerald-600/70 text-emerald-400'
          }`}
        >
          {pdrStatus?.isGpsLost ? (
            <>
              <Footprints className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>PDR Dead Reckoning (±{pdrStatus?.accuracyMeters ?? 25}m)</span>
            </>
          ) : (
            <>
              <span className={`w-2 h-2 rounded-full ${isPowerSaving ? 'bg-[#00ff41]' : 'bg-emerald-400 animate-pulse'}`} />
              <span>GPS Live (±{pdrStatus?.accuracyMeters ?? 15}m)</span>
            </>
          )}
        </div>
      </div>

      {/* REQUIREMENT: Red Triangle (Top Right) to Report Hazard */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            if (onOpenReportHazard) onOpenReportHazard();
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95 border ${
            isPowerSaving
              ? 'bg-[rgba(0,255,65,0.12)] border-[#00ff41] text-[#00ff41] backdrop-blur-sm'
              : 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-400 shadow-[0_0_20px_rgba(255,38,61,0.6)] hover:brightness-110'
          }`}
          title="Report Obstruction / Hazard (BLE)"
        >
          <TriangleAlert className={`w-4 h-4 ${isPowerSaving ? 'text-[#00ff41] fill-[#00ff41]' : 'text-white fill-white animate-pulse'}`} />
          <span>Report Hazard</span>
        </button>

        <span className="text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-sm">
          💡 Tap map directly to drop pin
        </span>
      </div>

      {/* GOOGLE MAPS STYLE RECALIBRATE / MY LOCATION BUTTON (Bottom Right above zoom) */}
      <div className="absolute bottom-16 right-3 z-[400] pointer-events-auto flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handleRecalibrate}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider shadow-2xl transition-all active:scale-95 border backdrop-blur-md ${
            isFollowingUser
              ? isPowerSaving
                ? 'border-[#00ff41] bg-[rgba(0,255,65,0.18)] text-[#00ff41]'
                : 'border-emerald-500 bg-emerald-950/80 text-emerald-300'
              : isPowerSaving
              ? 'border-white/20 bg-black/80 text-stone-300 hover:text-white'
              : 'border-white/20 bg-black/85 text-stone-200 hover:bg-neutral-900'
          }`}
          title="Center on my location and recalibrate GPS hardware lock"
        >
          <Crosshair className={`w-4 h-4 ${recalibrating ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{recalibrating ? 'Locking GPS…' : 'Recalibrate'}</span>
        </button>
      </div>

      {/* Free Exploration Notice when user pans away */}
      {!isFollowingUser && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] pointer-events-auto">
          <button
            type="button"
            onClick={handleRecalibrate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-black/85 text-stone-200 border border-white/20 backdrop-blur-md shadow-lg hover:text-white"
          >
            <Navigation className="w-3 h-3 text-emerald-400" />
            <span>Map Unlocked · Tap to Re-center</span>
          </button>
        </div>
      )}
    </div>
  );
}
