'use client';

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultLocations, MUMBAI_BOUNDS, MUMBAI_CENTER } from '@/lib/mockData';
import { usePowerMode } from '@/lib/powerMode';
import { HazardMarker, HazardType, HAZARD_INFO } from '@/types/hazards';
import { createHazardReport } from '@/lib/hazards';
import { PDRKalmanTracker, LocationEstimate } from '@/lib/pdr';
import { calculateHaversineDistance } from '@/lib/mumbaiSearch';
import {
  TriangleAlert,
  Footprints,
  Crosshair,
  X,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

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
  onHazardPlaced?: (hazard: HazardMarker) => void;
  isResponder?: boolean;
  hazards?: HazardMarker[];
  onConfirmHazard?: (id: string) => void;
  onPdrUpdate?: (estimate: LocationEstimate) => void;
}

// Proximity constraint: 300 meters maximum visual radius for reporting
const HAZARD_REPORTING_RADIUS_METERS = 300;
// Proximity display radius: 3 km around user to reduce mobile DOM load
const HAZARD_DISPLAY_RADIUS_METERS = 3000;

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
  onHazardPlaced,
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

  // Hazard Placement Pointer Mode State
  const [isReportingMode, setIsReportingMode] = useState<boolean>(false);
  const [selectedHazardType, setSelectedHazardType] = useState<HazardType>('flooded');
  const [reportWarning, setReportWarning] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const isReportingModeRef = useRef<boolean>(false);
  const selectedHazardTypeRef = useRef<HazardType>('flooded');
  const onHazardPlacedRef = useRef<((h: HazardMarker) => void) | undefined>(onHazardPlaced);

  useEffect(() => {
    isReportingModeRef.current = isReportingMode;
  }, [isReportingMode]);

  useEffect(() => {
    selectedHazardTypeRef.current = selectedHazardType;
  }, [selectedHazardType]);

  useEffect(() => {
    onHazardPlacedRef.current = onHazardPlaced;
  }, [onHazardPlaced]);

  // Status badge state
  const [gpsStatus, setGpsStatus] = useState<{ isLost: boolean; accuracy: number }>({
    isLost: false,
    accuracy: 15,
  });

  const [recalibrating, setRecalibrating] = useState<boolean>(false);
  const { isPowerSaving } = usePowerMode();

  // 1. Initialize PDR Tracker & Hardware GPS
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
            color: isPowerSaving ? '#ff263d' : '#ff263d',
            fillColor: isPowerSaving ? '#ff263d' : '#ff263d',
            dashArray: '5, 5',
          });
        }
      }

      // NOTE: Removed continuous panTo here so map NEVER yanks back unexpectedly!
      // Only updates React status state if status flag changed
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
          tracker.updateGPS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
        () => {
          // GPS lost, PDR dead-reckoning engages automatically
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
      );
    }

    return () => {
      tracker.stop();
      unsubscribe();
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [userLocation, isPowerSaving, onPdrUpdate]);

  // 2. Initialize Leaflet Map (Holds manual zoom & pan strictly)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

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

    // High-performance direct CDN tile layer with HTTP/2 multi-subdomain loading
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      keepBuffer: 8,
      updateWhenIdle: true,
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
          border: 4px solid ${isPowerSaving ? '#ff263d' : '#ff263d'};
          box-shadow: 0 0 0 8px ${isPowerSaving ? 'rgba(74, 222, 128, 0.04)' : 'rgba(255,38,61,0.25)'};
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
      color: isPowerSaving ? '#ff263d' : '#ff263d',
      fillColor: isPowerSaving ? '#ff263d' : '#ff263d',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '5, 5',
    }).addTo(map);
    accuracyCircleRef.current = accuracyCircle;

    // PROXIMITY CIRCLE: 300m Verified Visual Reporting Radius
    const proximityCircle = L.circle(userLocation, {
      radius: HAZARD_REPORTING_RADIUS_METERS,
      color: isPowerSaving ? '#4ADE80' : '#3b82f6',
      fillColor: isPowerSaving ? '#4ADE80' : '#3b82f6',
      fillOpacity: 0.05,
      weight: 1.5,
      dashArray: '4, 4',
    }).addTo(map);
    proximityCircleRef.current = proximityCircle;

    // INTERACTIVE MAP CLICK: Instant frictionless hazard placement
    map.on('click', (e: L.LeafletMouseEvent) => {
      const tappedLat = parseFloat(e.latlng.lat.toFixed(5));
      const tappedLng = parseFloat(e.latlng.lng.toFixed(5));
      const userLat = currentUserPos.current[0];
      const userLng = currentUserPos.current[1];

      const distance = calculateHaversineDistance(userLat, userLng, tappedLat, tappedLng);
      const isWithinProximity = distance <= HAZARD_REPORTING_RADIUS_METERS;

      // IF USER IS IN HAZARD REPORTING POINTER MODE:
      if (isReportingModeRef.current) {
        if (isWithinProximity) {
          const type = selectedHazardTypeRef.current;
          const info = HAZARD_INFO[type] || {
            emoji: '⚠️',
            label: type,
            color: '#ef4444',
            description: 'Hazard',
          };

          const newHazard = createHazardReport({
            type,
            latitude: tappedLat,
            longitude: tappedLng,
            accuracyMeters: 15,
            severity: 'high',
            description: `${info.label} placed by citizen within visual proximity (~${Math.round(distance)}m).`,
            reportedBy: 'MESH-CITIZEN-PROXIMITY',
          });

          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([40, 50, 40]);
          }

          if (onHazardPlacedRef.current) {
            onHazardPlacedRef.current(newHazard);
          }

          setIsReportingMode(false);
          setReportSuccess(`✅ ${info.emoji} ${info.label} reported & broadcast over BLE!`);
          setTimeout(() => setReportSuccess(null), 3500);
        } else {
          setReportWarning(
            `🚫 Too far (~${Math.round(distance)}m). You can only report within your 300m visual proximity circle.`
          );
          setTimeout(() => setReportWarning(null), 3500);
        }
        return;
      }

      // Normal mode: clicking outside reporting mode within proximity gives quick option
      if (isWithinProximity && onOpenReportHazardAt) {
        L.popup()
          .setLatLng(e.latlng)
          .setContent(`
            <div style="font-family: sans-serif; font-size: 12px; color: #111; padding: 2px;">
              <b style="color: #059669; font-size: 13px;">✅ Visual Proximity (~${Math.round(distance)}m)</b>
              <p style="margin: 4px 0 6px; font-size: 11px; color: #444;">${tappedLat}°N, ${tappedLng}°E</p>
              <button id="btn-quick-report-tap" style="
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
          const btn = document.getElementById('btn-quick-report-tap');
          if (btn) {
            btn.onclick = () => {
              map.closePopup();
              onOpenReportHazardAt([tappedLat, tappedLng]);
            };
          }
        }, 50);
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
  }, [userLocation, isPowerSaving, onOpenReportHazardAt, onSelectLocation]);

  // Visual highlight of proximity circle during reporting mode
  useEffect(() => {
    if (proximityCircleRef.current) {
      if (isReportingMode) {
        proximityCircleRef.current.setStyle({
          color: '#f59e0b',
          fillColor: '#f59e0b',
          fillOpacity: 0.15,
          weight: 3,
          dashArray: '6, 6',
        });
      } else {
        proximityCircleRef.current.setStyle({
          color: isPowerSaving ? '#4ADE80' : '#3b82f6',
          fillColor: isPowerSaving ? '#4ADE80' : '#3b82f6',
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: '4, 4',
        });
      }
    }
  }, [isReportingMode, isPowerSaving]);

  // 3. Render Nearby Hazards with Proximity Filter (<= 3 km)
  useEffect(() => {
    if (!mapInstanceRef.current || !hazardsLayerGroupRef.current) return;
    const group = hazardsLayerGroupRef.current;
    group.clearLayers();

    const userLat = currentUserPos.current[0];
    const userLng = currentUserPos.current[1];

    const nearbyHazards = hazards.filter((h) => {
      const dist = calculateHaversineDistance(userLat, userLng, h.latitude, h.longitude);
      return dist <= HAZARD_DISPLAY_RADIUS_METERS;
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

  // 4. Update Destination & Safe Street Route Polyline (Holds manual zoom level strictly)
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
        color: activeTarget ? '#ff263d' : isPowerSaving ? '#4ADE80' : '#00d294',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routePolylineRef.current = polyline;
    }
  }, [safeRouteWaypoints, destinationLocation, destinationName, safeRouteActive, activeTarget, isPowerSaving]);

  // 5. One-Tap Reporting at User's Current Location
  const handlePlaceAtCurrentLocation = useCallback(() => {
    const coords = currentUserPos.current;
    const type = selectedHazardType;
    const info = HAZARD_INFO[type] || {
      emoji: '⚠️',
      label: type,
      color: '#ef4444',
      description: 'Hazard',
    };

    const newHazard = createHazardReport({
      type,
      latitude: coords[0],
      longitude: coords[1],
      accuracyMeters: 15,
      severity: 'high',
      description: `${info.label} reported by citizen at user location.`,
      reportedBy: 'MESH-CITIZEN-LOCAL',
    });

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([40, 50, 40]);
    }

    if (onHazardPlaced) {
      onHazardPlaced(newHazard);
    }

    setIsReportingMode(false);
    setReportSuccess(`✅ ${info.emoji} ${info.label} reported & broadcast over BLE!`);
    setTimeout(() => setReportSuccess(null), 3500);
  }, [selectedHazardType, onHazardPlaced]);

  // 6. Google Maps Style Recalibrate Handler (Pan to user, preserving manual zoom)
  const handleRecalibrate = useCallback(() => {
    setRecalibrating(true);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentUserPos.current = [pos.coords.latitude, pos.coords.longitude];
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([pos.coords.latitude, pos.coords.longitude], {
              animate: true,
              duration: 0.6,
            });
          }
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([pos.coords.latitude, pos.coords.longitude]);
          }
          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng([pos.coords.latitude, pos.coords.longitude]);
            accuracyCircleRef.current.setRadius(pos.coords.accuracy);
          }
          if (proximityCircleRef.current) {
            proximityCircleRef.current.setLatLng([pos.coords.latitude, pos.coords.longitude]);
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
    <div className="relative w-full h-full select-none">
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
              ? 'bg-[rgba(8,19,12,0.96)] border-[rgba(74,222,128,0.32)] text-white'
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
              <span className={`w-2 h-2 rounded-full ${isPowerSaving ? 'bg-[#4ADE80]' : 'bg-emerald-400 animate-pulse'}`} />
              <span>GPS Live (±{gpsStatus.accuracy}m)</span>
            </>
          )}
        </div>
      </div>

      {/* Top Notification / Toast Feedback */}
      {reportSuccess && (
        <div className="absolute top-14 left-4 right-4 z-[450] flex justify-center pointer-events-none">
          <div className="bg-emerald-950 border border-emerald-500 text-emerald-200 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{reportSuccess}</span>
          </div>
        </div>
      )}

      {reportWarning && (
        <div className="absolute top-14 left-4 right-4 z-[450] flex justify-center pointer-events-none">
          <div className="bg-rose-950 border border-rose-500 text-rose-200 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{reportWarning}</span>
          </div>
        </div>
      )}

      {/* Reporting Mode Active Instruction Banner */}
      {isReportingMode && (
        <div className="absolute top-12 left-3 right-3 z-[410] flex justify-center pointer-events-none">
          <div className="bg-black/90 border border-amber-500/80 text-amber-300 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md">
            <span className="text-sm">🎯</span>
            <span>Tap inside 300m circle to place {HAZARD_INFO[selectedHazardType]?.label.split('/')[0]}</span>
          </div>
        </div>
      )}

      {/* SINGLE Designated Red Triangle Button (Top Right) to Toggle Placement Mode */}
      <div className="absolute top-[3.25rem] left-3 right-3 z-[400] flex flex-col items-start gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            setIsReportingMode((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95 border ${
            isReportingMode
              ? 'bg-amber-600 text-white border-amber-300 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              : isPowerSaving
              ? 'bg-[rgba(11,24,15,0.97)] border-[rgba(74,222,128,0.32)] text-white backdrop-blur-sm'
              : 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-400 shadow-[0_0_20px_rgba(255,38,61,0.6)] hover:brightness-110'
          }`}
          title={isReportingMode ? 'Cancel Placement' : 'Report Hazard (Within 300m Proximity)'}
        >
          {isReportingMode ? (
            <>
              <X className="w-4 h-4 text-white" />
              <span>Cancel</span>
            </>
          ) : (
            <>
              <TriangleAlert className={`w-4 h-4 ${isPowerSaving ? 'text-white fill-[#FFFFFF]' : 'text-white fill-white animate-pulse'}`} />
              <span>Report Hazard</span>
            </>
          )}
        </button>

        {!isReportingMode && (
          <span className="text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-sm">
            📍 Verified in 300m circle
          </span>
        )}
      </div>

      {/* FRICTIONLESS QUICK-REPORT DOCK (Appears when user clicks Report Hazard) */}
      {isReportingMode && (
        <div className="absolute bottom-16 left-3 right-3 z-[410] flex flex-col gap-2 pointer-events-auto">
          {/* Quick Hazard Type Selection Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-black/90 border border-white/20 p-2 rounded-2xl backdrop-blur-md shadow-2xl">
            {(['flooded', 'obstructed', 'electrical', 'collapsed', 'fire'] as HazardType[]).map((type) => {
              const info = HAZARD_INFO[type];
              const isSelected = selectedHazardType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedHazardType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg scale-105 border border-white/40'
                      : 'bg-white/10 text-stone-300 hover:bg-white/20'
                  }`}
                >
                  <span className="text-sm">{info.emoji}</span>
                  <span>{info.label.split('/')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Instant 1-Tap Placement at User Location */}
          <button
            type="button"
            onClick={handlePlaceAtCurrentLocation}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-2xl flex items-center justify-center gap-2 border border-red-400 hover:brightness-110 active:scale-95"
          >
            <MapPin className="w-4 h-4" />
            <span>Place {HAZARD_INFO[selectedHazardType]?.emoji} at My Current Location</span>
          </button>
        </div>
      )}

      {/* SINGLE Google Maps Style Recalibrate / Center Button (Bottom Right) */}
      {!isReportingMode && (
        <div className="absolute bottom-24 right-3 z-[400] pointer-events-auto">
          <button
            type="button"
            onClick={handleRecalibrate}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider shadow-2xl transition-all active:scale-95 border backdrop-blur-md ${
              isPowerSaving
                ? 'border-[rgba(74,222,128,0.32)] bg-[rgba(11,24,15,0.97)] text-white'
                : 'border-white/20 bg-black/85 text-stone-200 hover:bg-neutral-900'
            }`}
            title="Recalibrate and center on GPS location"
          >
            <Crosshair className={`w-4 h-4 ${recalibrating ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span>{recalibrating ? 'Locking…' : 'Recalibrate'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(MapInnerComponent);
