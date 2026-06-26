import type {
  BlackoutRule,
  Campaign,
  PlacementId,
  Sponsor,
  SponsorCandidate,
  SponsorDecision,
  SponsorRequest,
  SponsorResolutionContext,
} from './types';

export function buildIneligibleDecision(request: SponsorRequest, reason: string): SponsorDecision {
  return {
    requestId: request.requestId,
    sponsorId: null,
    campaignId: null,
    assetId: null,
    placement: request.requestedPlacement,
    mode: request.mode,
    reason,
    eligible: false,
  };
}

export function buildEligibleDecision(request: SponsorRequest, candidate: SponsorCandidate, reason: string): SponsorDecision {
  return {
    requestId: request.requestId,
    sponsorId: candidate.sponsor.sponsorId,
    campaignId: candidate.campaign.campaignId,
    assetId: candidate.sponsor.assetId,
    placement: request.requestedPlacement,
    mode: request.mode,
    reason,
    eligible: true,
  };
}

export function isDateActive(startDate: string, endDate: string, now: Date): boolean {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return false;
  }

  const currentTime = now.getTime();
  return currentTime >= start && currentTime <= end;
}

export function isPlacementAllowed(sponsor: Sponsor, campaign: Campaign, placement: PlacementId): boolean {
  return sponsor.allowedPlacements.includes(placement) && campaign.placements.includes(placement);
}

export function hasActiveBlackoutRule(blackoutRules: BlackoutRule[], placement: PlacementId, now: Date): boolean {
  return blackoutRules.some((rule) => isBlackoutRuleActive(rule, placement, now));
}

export function isBlackoutRuleActive(rule: BlackoutRule, placement: PlacementId, now: Date): boolean {
  const matchesPlacement = !rule.placements || rule.placements.length === 0 || rule.placements.includes(placement);
  return matchesPlacement && isDateActive(rule.startDate, rule.endDate, now);
}

export function extractResolutionContext(request: SponsorRequest): SponsorResolutionContext {
  const context = request.context ?? {};

  return {
    gameId: typeof context.gameId === 'string' ? context.gameId : null,
    inning: typeof context.inning === 'number' ? context.inning : null,
    isLivePlay: context.isLivePlay === true,
    betweenInnings: context.betweenInnings === true,
  };
}

export function isCampaignContextAllowed(campaign: Campaign, context: SponsorResolutionContext): boolean {
  if (context.isLivePlay && !campaign.rules.allowDuringLivePlay) {
    return false;
  }

  if (context.betweenInnings && !campaign.rules.allowBetweenInnings) {
    return false;
  }

  return true;
}

export function compareCandidatesByPriority(left: SponsorCandidate, right: SponsorCandidate): number {
  return right.sponsor.priority - left.sponsor.priority;
}
