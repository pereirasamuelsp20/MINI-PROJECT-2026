export type UserRole = 'citizen' | 'responder';

export type AlertNeed = 'Medical' | 'Trapped' | 'Supplies' | 'Evacuation';
export type AlertPriority = 'urgent' | 'normal';
export type AlertStatus = 'new' | 'verified' | 'dispatched' | 'in_progress' | 'resolved' | 'rejected';

export interface Alert {
  id: string;
  need: AlertNeed;
  status: AlertStatus;
  details: string;
  priority: AlertPriority;
  citizenName: string;
  area: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  createdAt: string;
  updatedAt?: string;
  verifiedBy?: string;
}

export type AnnouncementSeverity = 'info' | 'warning' | 'critical';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  area: string;
  senderName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ResponderMessage {
  id: string;
  senderName: string;
  area: string;
  urgency: 'urgent' | 'normal';
  body: string;
  createdAt: string;
}

export interface MeshChannel {
  id: string;
  name: string;
  channelType: 'community' | 'group';
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MeshMessage {
  id: string;
  channelName: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  transmission: 'ble' | 'mesh' | 'cloud';
  createdAt: string;
  updatedAt?: string;
}

export interface ReliefData {
  announcements: Announcement[];
  alerts: Alert[];
  responderMessages: ResponderMessage[];
  channels: MeshChannel[];
  meshMessages: MeshMessage[];
}

export interface ReliefLocation {
  id: string;
  name: string;
  type: 'camp' | 'safe_zone' | 'relay';
  latitude: number;
  longitude: number;
  capacity?: string;
  supplies?: string[];
  distanceEstimate?: string;
  city?: string;
}

export interface MeshContact {
  id: string; // Unique Mesh ID, e.g. "MESH-7721"
  name: string; // "Pooja Sharma", "Dr. Rohan Patel"
  avatarColor: string; // Tailored color badge
  area?: string; // e.g. "Dadar West"
  statusNote?: string;
  lastSeen: string; // e.g. "In BLE range · 1 hop"
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  peerId: string; // Unique Mesh ID of recipient/sender
  sender: 'me' | 'peer';
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  hops: number;
}

export interface DevicePermissions {
  locationGranted: boolean;
  bluetoothGranted: boolean;
  city: string;
  userCoords: [number, number] | null;
}

