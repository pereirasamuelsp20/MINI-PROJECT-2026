import { HazardMarker } from '@/types/hazards';
import { defaultLocations } from './mockData';
import {
  calculateHaversineDistance,
  calculateInstantSafeRoute,
  calculateSafeEvacuationRoute,
  SafeRouteResult,
} from './routingEngine';

export {
  calculateHaversineDistance,
  calculateInstantSafeRoute,
  calculateSafeEvacuationRoute,
  type SafeRouteResult,
};

export interface SearchableLocation {
  id: string;
  name: string;
  category: 'camp' | 'safe_zone' | 'hospital' | 'hub' | 'relay';
  latitude: number;
  longitude: number;
  description: string;
  badge?: string;
}

export const MUMBAI_SEARCHABLE_LOCATIONS: SearchableLocation[] = [
  // Existing Relief Camps & Safe Havens
  ...defaultLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    category: loc.type as 'camp' | 'safe_zone' | 'relay',
    latitude: loc.latitude,
    longitude: loc.longitude,
    description: loc.supplies ? `Supplies: ${loc.supplies.join(', ')}` : (loc.distanceEstimate || 'Relief Haven'),
    badge: loc.type === 'camp' ? 'Relief Camp' : loc.type === 'safe_zone' ? 'Safe Haven' : 'BLE Relay',
  })),

  // Emergency & Trauma Hospitals
  {
    id: 'hosp-1',
    name: 'KEM Hospital & Emergency Medical Center',
    category: 'hospital',
    latitude: 19.0028,
    longitude: 72.8427,
    description: '24/7 Trauma, ICU & Blood Bank · Parel',
    badge: 'Hospital',
  },
  {
    id: 'hosp-2',
    name: 'Lilavati Hospital & Research Centre',
    category: 'hospital',
    latitude: 19.0514,
    longitude: 72.8291,
    description: 'Emergency Services, Intensive Care · Bandra West',
    badge: 'Hospital',
  },
  {
    id: 'hosp-3',
    name: 'Lokmanya Tilak Municipal General Hospital (Sion)',
    category: 'hospital',
    latitude: 19.0366,
    longitude: 72.8601,
    description: 'Major Disaster Triage & Emergency Unit · Sion',
    badge: 'Hospital',
  },
  {
    id: 'hosp-4',
    name: 'P. D. Hinduja Hospital',
    category: 'hospital',
    latitude: 19.0333,
    longitude: 72.8394,
    description: '24-hour Emergency Medical Unit · Mahim',
    badge: 'Hospital',
  },

  // Key Safe Zones & Evacuation Corridors
  {
    id: 'hub-1',
    name: 'Shivaji Park Open Grounds',
    category: 'safe_zone',
    latitude: 19.0269,
    longitude: 72.8385,
    description: 'Large Elevated Open Ground · Flood-Resistant Evacuation Assembly',
    badge: 'Safe Zone',
  },
  {
    id: 'hub-2',
    name: 'Bandra Reclamation High Ground',
    category: 'safe_zone',
    latitude: 19.0434,
    longitude: 72.8258,
    description: 'Coastal Elevated Staging Area · Helipad & Relief Triage',
    badge: 'Safe Zone',
  },
  {
    id: 'hub-3',
    name: 'BKC Open Exhibition Grounds',
    category: 'safe_zone',
    latitude: 19.0657,
    longitude: 72.8672,
    description: 'Bandra-Kurla Complex Humanitarian Aid Hub',
    badge: 'Relief Hub',
  },
  {
    id: 'hub-4',
    name: 'Dadar Central Transit Corridor',
    category: 'hub',
    latitude: 19.0178,
    longitude: 72.8478,
    description: 'Central Mumbai Transfer Hub & Civil Defence Station',
    badge: 'Hub',
  },
  {
    id: 'hub-5',
    name: 'Andheri Sports Complex Relief Haven',
    category: 'camp',
    latitude: 19.1311,
    longitude: 72.8317,
    description: 'Covered Stadium Shelter · Western Suburbs Evacuation',
    badge: 'Relief Camp',
  },
  {
    id: 'hub-6',
    name: 'Kurla West Municipal School Haven',
    category: 'safe_zone',
    latitude: 19.0712,
    longitude: 72.8805,
    description: 'Multistory Flood-Safe Haven with Generator Power',
    badge: 'Safe Haven',
  },
  {
    id: 'hub-7',
    name: 'Colaba Disaster Station & Sea Haven',
    category: 'safe_zone',
    latitude: 18.9154,
    longitude: 72.8258,
    description: 'South Mumbai Coastal Evacuation Point',
    badge: 'Safe Haven',
  },
];

/**
 * Generates the optimal safe route from start to destination along real Mumbai streets,
 * dynamically steering around reported hazards/flooded areas.
 */
export function generateBestSafeRoute(
  start: [number, number],
  dest: [number, number],
  hazards: HazardMarker[] = []
): SafeRouteResult {
  return calculateInstantSafeRoute(start, dest, hazards);
}

