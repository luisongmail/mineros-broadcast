export type PlacementId = 'scorebug' | 'ticker' | 'sponsor_overlay' | 'fullscreen' | 'lineup' | 'summary';

export type SponsorStatus = 'draft' | 'review' | 'active' | 'paused' | 'expired' | 'archived';
export type CampaignStatus = 'active' | 'paused' | 'ended' | 'draft';
export type RotationMode = 'weighted' | 'sequential' | 'random';
export type SponsorMode = 'preview' | 'program';
export type ImpressionTrigger = 'manual' | 'automatic';

export interface ExposureLimits {
  maxPerGame?: number;
  maxPerInning?: number;
  minSecondsBetween?: number;
  maxDurationSeconds?: number;
}

export interface BlackoutRule {
  ruleId: string;
  startDate: string;
  endDate: string;
  placements?: PlacementId[];
  reason?: string;
}

export interface SponsorMetadata {
  owner: string;
  createdAt: string;
}

export interface Sponsor {
  sponsorId: string;
  name: string;
  brand: string;
  assetId: string;
  status: SponsorStatus;
  priority: number;
  weight: number;
  allowedPlacements: PlacementId[];
  campaignIds: string[];
  startDate: string;
  endDate: string;
  exposureLimits: ExposureLimits;
  blackoutRules: BlackoutRule[];
  metadata: SponsorMetadata;
}

export interface Campaign {
  campaignId: string;
  name: string;
  sponsorIds: string[];
  status: CampaignStatus;
  placements: PlacementId[];
  startDate: string;
  endDate: string;
  rules: {
    rotationMode: RotationMode;
    allowDuringLivePlay: boolean;
    allowBetweenInnings: boolean;
  };
}

export interface Impression {
  impressionId: string;
  sponsorId: string;
  campaignId: string;
  placement: PlacementId;
  zoneId?: string;
  sceneId?: string;
  gameId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  trigger: ImpressionTrigger;
}

export interface SponsorRequest {
  requestId: string;
  trigger: string;
  requestedPlacement: PlacementId;
  preferredZone?: string;
  mode: SponsorMode;
  context?: Record<string, unknown>;
}

export interface SponsorDecision {
  requestId: string;
  sponsorId: string | null;
  campaignId: string | null;
  assetId: string | null;
  placement: PlacementId;
  mode: SponsorMode;
  reason: string;
  eligible: boolean;
}

export interface SponsorCandidate {
  sponsor: Sponsor;
  campaign: Campaign;
}

export interface SponsorResolutionContext {
  gameId: string | null;
  inning: number | null;
  isLivePlay: boolean;
  betweenInnings: boolean;
}
