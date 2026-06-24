export type OperatorState = 'idle' | 'preview_dirty' | 'ready_to_take' | 'program_live' | 'reverted' | 'error';

export interface Zone {
  id: string;
  name: string;
  purpose: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priorityBase: number;
  editable: boolean;
  removable: boolean;
  visible: boolean;
  responsive: boolean;
  safeAreaRequired: boolean;
  assignedOverlays: string[];
}

export interface OverlayAssignment {
  overlayId: string;
  zoneId: string;
}

export interface Profile {
  id: string;
  name: string;
  templateId: string;
  category: string;
  tournament: string;
  season: string;
  platform: string;
  createdBy: string;
  status: 'draft' | 'active' | 'archived';
  zones: Zone[];
  scenes: string[];
  overlayAssignments: OverlayAssignment[];
  sponsorRules: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  category: string;
  tournament: string;
  profileId: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
}

export interface LayoutSnapshot {
  profileId: string | null;
  zones: Zone[];
  scenes: string[];
  overlayAssignments: OverlayAssignment[];
  activeSceneId: string | null;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  operator: string;
  action: 'preparePreview' | 'take' | 'cancel' | 'revert';
  resource: string;
  previousState: LayoutSnapshot;
  newState: LayoutSnapshot;
  origin: string;
  result: 'success' | 'error';
}

export interface LockRecord {
  resource: string;
  operator: string;
  startedAt: string;
  lastActivityAt: string;
  expiresAt: string;
  status: 'active' | 'expired';
}
