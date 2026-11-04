'use client';

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultLocations, MUMBAI_BOUNDS, MUMBAI_CENTER } from '@/lib/mockData';
import { usePowerMode } from '@/lib/powerMode';
import { HazardMarker, HAZARD_INFO } from '@/types/hazards';
import { PDRKalmanTracker, LocationEstimate } from '@/lib/pdr';
import { calculateHaversineDistance } from '@/lib/mumbaiSearch';
import { TriangleAlert, Footprints, Crosshair } from 'lucide-react';

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

// Proximity constraint: 300 meters maximum visual radius for reporting
const HAZARD_REPORTING_RADIUS_METERS = 300;
// Proximity display radius: 2.5 km around user to reduce mobile DOM load
const HAZARD_DISPLAY_RADIUS_METERS = 2500;

function MapInnerComponent({
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

  // Layer references for 0-latency direct updates
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const proximityCircleRef = useRef<L.Circle | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const hazardsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const reliefLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const trackerRef = useRef<PDRKalmanTracker | null>(null);
  const currentUserPos = useRef<[number, number]>(userLocation);

  // Status badge state (only updates on actual status transitions to prevent re-renders)
  const [gpsStatus, setGpsStatus] = useState<{ isLost: boolean; accuracy: number }>({
    isLost: false,
    accuracy: 15,
  });

  const [recalibrating, setRecalibrating] = useState<boolean>(false);
  const isFollowingUserRef = useRef<boolean>(true);

  const { isPowerSaving } = usePowerMode();

  // 1. Initialize PDR Tracker & Hardware GPS (Pure GPS prioritized)
  useEffect(() => {
    const tracker = new PDRKalmanTracker(userLocation[0], userLocation[1]);
    trackerRef.current = tracker;
    tracker.start();

    const unsubscribe = tracker.onUpdate((estimate) => {
      currentUserPos.current = [estimate.latitude, estimate.longitude];

      // Update Leaflet marker and circles DIRECTLY in DOM without triggering React re-renders
      if (userMarkerRef.current && accuracyCircleRef.current && proximityCircleRef.current) {
        const newPos = L.latLng(estimate.latitude, estimate.longitude);
        userMarkerRef.current.setLatLng(newPos);
        accuracyCircleRef.current.setLatLng(newPos);
        proximityCircleRef.current.setLatLng(newPos);
        accuracyCircleRef.current.setRadius(estimate.accuracyMeters);

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

      // Smooth pan ONLY if following user, holding the user's manual zoom level
      if (isFollowingUserRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.panTo([estimate.latitude, estimate.longitude], {
          animate: true,
          duration: 0.4,
        });
      }

      // Only update React status state if status flag changed
      setGpsStatus((prev) => {
        if (prev.isLost !== estimate.isGpsLost || Math.abs(prev.accuracy - estimate.accuracyMeters) > 8) {
          return { isLost: estimate.isGpsLost, accuracy: estimate.accuracyMeters };
        }
        return prev;
      });

      if (onPdrUpdate) onPdrUpdate(estimate);
    });

    // Hardware GPS Watcher
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
        () => {},
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
  }, [isPowerSaving]);

  // 2. Initialize Leaflet Map ONCE on Mount (Holds zoom permanently)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Requirement: Zoom in on load to level 16, then HOLD manual zoom
    const initialZoom = 16;

    const map = L.map(mapContainerRef.current, {
      center: userLocation,
      zoom: initialZoom,
      minZoom: 10,
      maxZoom: 19,
      maxBounds: MUMBAI_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // User manual navigation: stop auto-centering when user touches or zooms
    map.on('dragstart', () => {
      isFollowingUserRef.current = false;
    });
    map.on('zoomstart', () => {
      isFollowingUserRef.current = false;
    });

    // High-performance direct CDN tile layer with HTTP/2 multi-subdomain concurrent loading
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      keepBuffer: 8,        // Keep 8 offscreen tiles in memory for instant pan response
      updateWhenIdle: true, // Only render new tiles when pan settles (eliminates mobile stutter)
      updateWhenZooming: false,
      crossOrigin: true,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // Zoom controls at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer groups for fast incremental updates without re-renders
    const reliefGroup = L.layerGroup().addTo(map);
    reliefLayerGroupRef.current = reliefGroup;

    const hazardsGroup = L.layerGroup().addTo(map);
    hazardsLayerGroupRef.current = hazardsGroup;

    // User Marker
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

    // GPS Accuracy Circle
    const accuracyCircle = L.circle(userLocation, {
      radius: 20,
      color: isPowerSaving ? '#00ff41' : '#ff263d',
      fillColor: isPowerSaving ? '#00ff41' : '#ff263d',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '5, 5',
    }).addTo(map);
    accuracyCircleRef.current = accuracyCircle;

    // PROXIMITY CIRCLE: 300m Verified Visual Reporting Radius
    const proximityCircle = L.circle(userLocation, {
      radius: HAZARD_REPORTING_RADIUS_METERS,
      color: isPowerSaving ? '#00ff41' : '#3b82f6',
      fillColor: isPowerSaving ? '#00ff41' : '#3b82f6',
      fillOpacity: 0.05,
      weight: 1.5,
      dashArray: '4, 4',
    }).addTo(map);
    proximityCircleRef.current = proximityCircle;

    // REQUIREMENT: Tap anywhere on map to report hazard - ONLY valid within proximity circle!
    map.on('click', (e: L.LeafletMouseEvent) => {
      const tappedLat = parseFloat(e.latlng.lat.toFixed(5));
      const tappedLng = parseFloat(e.latlng.lng.toFixed(5));
      const userLat = currentUserPos.current[0];
      const userLng = currentUserPos.current[1];

      // Calculate distance from user to tapped spot
      const distance = calculateHaversineDistance(userLat, userLng, tappedLat, tappedLng);
      const isWithinProximity = distance <= HAZARD_REPORTING_RADIUS_METERS;

      if (isWithinProximity) {
        // Valid spot within 300m proximity
        L.popup()
          .setLatLng(e.latlng)
          .setContent(`
            <div style="font-family: sans-serif; font-size: 12px; color: #111; padding: 2px;">
              <b style="color: #059669; font-size: 13px;">✅ Visual Proximity (~${Math.round(distance)}m)</b>
              <p style="margin: 4px 0 6px; font-size: 11px; color: #444;">${tappedLat}°N, ${tappedLng}°E</p>
              <button id="btn-report-verified-tap" style="
                background: #ff263d;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 11px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
              ">Report Obstruction Here</button>
            </div>
          `)
          .openOn(map);

        setTimeout(() => {
          const btn = document.getElementById('btn-report-verified-tap');
          if (btn) {
            btn.onclick = () => {
              map.closePopup();
              if (onOpenReportHazardAt) {
                onOpenReportHazardAt([tappedLat, tappedLng]);
              }
            };
          }
        }, 50);
      } else {
        // Out of range: block reporting beyond visual proximity
        L.popup()
          .setLatLng(e.latlng)
          .setContent(`
            <div style="font-family: sans-serif; font-size: 12px; color: #111; padding: 2px; max-width: 200px;">
              <b style="color: #dc2626; font-size: 13px;">🚫 Outside Reporting Radius</b>
              <p style="margin: 4px 0 2px; font-size: 11px; color: #555;">
                This spot is <b>${Math.round(distance)}m away</b>.
              </p>
              <p style="margin: 2px 0 0; font-size: 10px; color: #777;">
                Obstructions can only be reported within your visual proximity circle (300m) to ensure verification.
              </p>
            </div>
          `)
          .openOn(map);
      }
    });

    // Static Relief Haven Markers
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

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Proximity-Filtered Hazard Flags (Reduces DOM load & renders instantly)
  useEffect(() => {
    if (!hazardsLayerGroupRef.current) return;
    const group = hazardsLayerGroupRef.current;
    group.clearLayers();

    const uLat = currentUserPos.current[0];
    const uLng = currentUserPos.current[1];

    // REQUIREMENT: Only render hazard flags in user's proximity (<= 2.5km) to reduce load
    const nearbyHazards = hazards.filter((h) => {
      const d = calculateHaversineDistance(uLat, uLng, h.latitude, h.longitude);
      return d <= HAZARD_DISPLAY_RADIUS_METERS;
    });

    nearbyHazards.forEach((hazard) => {
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
        </div>
      `);

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

  // 4. Update Destination & Safe Route Polyline (Without auto-zooming or changing zoom level!)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (destinationMarkerRef.current) {
      map.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

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

    if (safeRouteActive && safeRouteWaypoints && safeRouteWaypoints.length >= 2) {
      const polyline = L.polyline(safeRouteWaypoints, {
        color: activeTarget ? '#ff263d' : isPowerSaving ? '#00ff41' : '#00d294',
        weight: 5,
        opacity: 0.9,
        dashArray: '7, 7',
      }).addTo(map);

      routePolylineRef.current = polyline;
      // NOTE: Removed fitBounds() per user requirement! The zoom level is strictly held.
    }
  }, [safeRouteWaypoints, destinationLocation, destinationName, safeRouteActive, activeTarget, isPowerSaving]);

  // 5. Google Maps Style Recalibrate Handler (Pan to user, preserving manual zoom)
  const handleRecalibrate = useCallback(() => {
    setRecalibrating(true);
    isFollowingUserRef.current = true;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const freshLat = pos.coords.latitude;
          const freshLng = pos.coords.longitude;
          currentUserPos.current = [freshLat, freshLng];

          if (trackerRef.current) {
            trackerRef.current.updateGPS(freshLat, freshLng, Math.round(pos.coords.accuracy));
          }

          // Pan to user while PRESERVING current manual zoom level
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([freshLat, freshLng], {
              animate: true,
              duration: 0.6,
            });
          }
          setRecalibrating(false);
        },
        () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo(currentUserPos.current, {
              animate: true,
              duration: 0.6,
            });
          }
          setRecalibrating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(currentUserPos.current, {
          animate: true,
          duration: 0.6,
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
            gpsStatus.isLost
              ? 'bg-amber-950/80 border-amber-600/70 text-amber-300'
              : isPowerSaving
              ? 'bg-black/90 border-[#00ff41]/30 text-[#00ff41]'
              : 'bg-black/80 border-emerald-600/70 text-emerald-400'
          }`}
        >
          {gpsStatus.isLost ? (
            <>
              <Footprints className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>PDR Dead Reckoning (±{gpsStatus.accuracy}m)</span>
            </>
          ) : (
            <>
              <span className={`w-2 h-2 rounded-full ${isPowerSaving ? 'bg-[#00ff41]' : 'bg-emerald-400 animate-pulse'}`} />
              <span>GPS Live (±{gpsStatus.accuracy}m)</span>
            </>
          )}
        </div>
      </div>

      {/* SINGLE Designated Red Triangle Button (Top Right) to Report Hazard */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-1.5 pointer-events-auto">
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
          title="Report Obstruction at your location (Within 300m Proximity)"
        >
          <TriangleAlert className={`w-4 h-4 ${isPowerSaving ? 'text-[#00ff41] fill-[#00ff41]' : 'text-white fill-white animate-pulse'}`} />
          <span>Report Hazard</span>
        </button>

        <span className="text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-sm">
          📍 Verified in 300m circle
        </span>
      </div>

      {/* SINGLE Google Maps Style Recalibrate / Center Button (Bottom Right) */}
      <div className="absolute bottom-16 right-3 z-[400] pointer-events-auto">
        <button
          type="button"
          onClick={handleRecalibrate}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider shadow-2xl transition-all active:scale-95 border backdrop-blur-md ${
            isPowerSaving
              ? 'border-[#00ff41] bg-[rgba(0,255,65,0.18)] text-[#00ff41]'
              : 'border-white/20 bg-black/85 text-stone-200 hover:bg-neutral-900'
          }`}
          title="Recalibrate and center on GPS location"
        >
          <Crosshair className={`w-4 h-4 ${recalibrating ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
          <span>{recalibrating ? 'Locking…' : 'Recalibrate'}</span>
        </button>
      </div>
    </div>
  );
}

export default memo(MapInnerComponent);
