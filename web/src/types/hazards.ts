export type HazardType = 
  | 'flooded'
  | 'obstructed'
  | 'collapsed'
  | 'fire'
  | 'chemical'
  | 'electrical'
  | 'crowd';

export interface HazardMarker {
  id: string;
  type: HazardType;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  description: string;
  reportedBy: string; // mesh ID, e.g. "MESH-NODE-41" or "Citizen-BLE"
  reportedAt: string; // ISO timestamp
  severity: 'low' | 'medium' | 'high';
  confirmed: boolean; // verified by responders or multiple reports
  confirmCount: number;
  expiresAt: string; // auto-expire after 6 hours
  syncedViaBLE: boolean;
  city: string;
}

export const HAZARD_INFO: Record<
  HazardType,
  { emoji: string; label: string; color: string; description: string }
> = {
  flooded: {
    emoji: '🌊',
    label: 'Waterlogged / Flooded',
    color: '#3b82f6',
    description: 'Deep standing water, impassable on foot or vehicles',
  },
  obstructed: {
    emoji: '🚧',
    label: 'Road Obstructed',
    color: '#f59e0b',
    description: 'Fallen trees, debris, barricades or damaged roadway',
  },
  collapsed: {
    emoji: '🏚️',
    label: 'Structural Collapse',
    color: '#ef4444',
    description: 'Building, wall, or flyover structural failure',
  },
  fire: {
    emoji: '🔥',
    label: 'Fire Hazard',
    color: '#dc2626',
    description: 'Active flames, smoke plume, or gas fire danger',
  },
  chemical: {
    emoji: '☣️',
    label: 'Hazardous Spills',
    color: '#a855f7',
    description: 'Industrial runoff, fuel leak or chemical contamination',
  },
  electrical: {
    emoji: '⚡',
    label: 'Live Wire / Sparking',
    color: '#eab308',
    description: 'Exposed live power cables touching water or ground',
  },
  crowd: {
    emoji: '👥',
    label: 'Dense Crowd Surge',
    color: '#f97316',
    description: 'Stampede risk or congested bottle-neck passage',
  },
};
