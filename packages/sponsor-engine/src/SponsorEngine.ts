import {
  buildEligibleDecision,
  buildIneligibleDecision,
  compareCandidatesByPriority,
  extractResolutionContext,
  hasActiveBlackoutRule,
  isCampaignContextAllowed,
  isDateActive,
  isPlacementAllowed,
} from './resolvers';
import type {
  Campaign,
  Impression,
  PlacementId,
  Sponsor,
  SponsorCandidate,
  SponsorDecision,
  SponsorRequest,
  SponsorResolutionContext,
} from './types';

const DEFAULT_RESOLUTION_CONTEXT: SponsorResolutionContext = {
  gameId: null,
  inning: null,
  isLivePlay: false,
  betweenInnings: false,
};

export class SponsorEngine {
  private sponsors = new Map<string, Sponsor>();
  private campaigns = new Map<string, Campaign>();
  private impressions: Impression[] = [];
  private impressionCounter = 0;
  private resolutionContext: SponsorResolutionContext = DEFAULT_RESOLUTION_CONTEXT;

  addSponsor(sponsor: Sponsor): void {
    this.sponsors.set(sponsor.sponsorId, this.clone(sponsor));
  }

  updateSponsor(sponsorId: string, patch: Partial<Sponsor>): void {
    const current = this.sponsors.get(sponsorId);

    if (!current) {
      throw new Error(`Sponsor not found: ${sponsorId}`);
    }

    const nextSponsor: Sponsor = {
      ...current,
      ...patch,
      exposureLimits: {
        ...current.exposureLimits,
        ...patch.exposureLimits,
      },
    };

    this.sponsors.set(sponsorId, this.clone(nextSponsor));
  }

  getSponsor(sponsorId: string): Sponsor | undefined {
    const sponsor = this.sponsors.get(sponsorId);
    return sponsor ? this.clone(sponsor) : undefined;
  }

  addCampaign(campaign: Campaign): void {
    this.campaigns.set(campaign.campaignId, this.clone(campaign));
  }

  getCampaign(campaignId: string): Campaign | undefined {
    const campaign = this.campaigns.get(campaignId);
    return campaign ? this.clone(campaign) : undefined;
  }

  resolve(request: SponsorRequest): SponsorDecision {
    const now = this.now();
    this.resolutionContext = extractResolutionContext(request);

    const candidates = this.collectCandidates(request.requestedPlacement, now);

    if (candidates.length === 0) {
      return buildIneligibleDecision(request, 'No hay sponsors elegibles para el placement solicitado');
    }

    const priorities = [...new Set(candidates.map((candidate) => candidate.sponsor.priority))].sort((left, right) => right - left);
    let lastFailureReason = 'No hay sponsors elegibles para el placement solicitado';

    for (const priority of priorities) {
      const pool = candidates.filter((candidate) => candidate.sponsor.priority === priority);
      const remaining = [...pool];

      while (remaining.length > 0) {
        const selected = this.weightedSelect(remaining);

        if (!selected) {
          break;
        }

        if (!this.withinExposureLimit(selected.sponsor, now)) {
          lastFailureReason = `Sponsor ${selected.sponsor.sponsorId} excedió sus límites de exposición`;
          this.removeCandidate(remaining, selected);
          continue;
        }

        if (!this.withinCooldown(selected.sponsor, now)) {
          lastFailureReason = `Sponsor ${selected.sponsor.sponsorId} está en cooldown`;
          this.removeCandidate(remaining, selected);
          continue;
        }

        if (hasActiveBlackoutRule(selected.sponsor.blackoutRules, request.requestedPlacement, now)) {
          lastFailureReason = `Sponsor ${selected.sponsor.sponsorId} está bloqueado por blackout rule`;
          this.removeCandidate(remaining, selected);
          continue;
        }

        return buildEligibleDecision(request, selected, 'Sponsor elegible seleccionado');
      }
    }

    return buildIneligibleDecision(request, lastFailureReason);
  }

  recordImpression(impression: Omit<Impression, 'impressionId'>): Impression {
    this.impressionCounter += 1;

    const normalizedImpression: Impression = {
      ...this.clone(impression),
      impressionId: `impression-${String(this.impressionCounter).padStart(6, '0')}`,
      durationSeconds: this.resolveDuration(impression),
    };

    this.impressions.push(normalizedImpression);
    return this.clone(normalizedImpression);
  }

  getImpressions(filter?: { sponsorId?: string; gameId?: string }): Impression[] {
    return this.impressions
      .filter((impression) => {
        if (filter?.sponsorId && impression.sponsorId !== filter.sponsorId) {
          return false;
        }

        if (filter?.gameId && impression.gameId !== filter.gameId) {
          return false;
        }

        return true;
      })
      .map((impression) => this.clone(impression));
  }

  private collectCandidates(placement: PlacementId, now: Date): SponsorCandidate[] {
    const candidates: SponsorCandidate[] = [];

    for (const sponsor of this.sponsors.values()) {
      for (const campaignId of sponsor.campaignIds) {
        const campaign = this.campaigns.get(campaignId);

        if (!campaign) {
          continue;
        }

        if (this.isEligible(sponsor, campaign, placement, now)) {
          candidates.push({ sponsor: this.clone(sponsor), campaign: this.clone(campaign) });
        }
      }
    }

    return candidates.sort(compareCandidatesByPriority);
  }

  private isEligible(sponsor: Sponsor, campaign: Campaign, placement: PlacementId, now: Date): boolean {
    if (sponsor.status !== 'active') {
      return false;
    }

    if (!isDateActive(sponsor.startDate, sponsor.endDate, now)) {
      return false;
    }

    if (campaign.status !== 'active') {
      return false;
    }

    if (!isDateActive(campaign.startDate, campaign.endDate, now)) {
      return false;
    }

    if (!sponsor.campaignIds.includes(campaign.campaignId) || !campaign.sponsorIds.includes(sponsor.sponsorId)) {
      return false;
    }

    if (!isPlacementAllowed(sponsor, campaign, placement)) {
      return false;
    }

    if (!isCampaignContextAllowed(campaign, this.resolutionContext)) {
      return false;
    }

    return true;
  }

  private withinExposureLimit(sponsor: Sponsor, now: Date): boolean {
    const { gameId, inning } = this.resolutionContext;
    const impressions = this.impressions.filter((impression) => impression.sponsorId === sponsor.sponsorId);
    const scopedImpressions = gameId ? impressions.filter((impression) => impression.gameId === gameId) : impressions;

    if (sponsor.exposureLimits.maxPerGame !== undefined && scopedImpressions.length >= sponsor.exposureLimits.maxPerGame) {
      return false;
    }

    if (sponsor.exposureLimits.maxPerInning !== undefined && inning !== null) {
      const inningImpressions = scopedImpressions.filter((impression) => {
        const impressionInning = this.readNumericContext(impression, 'inning');
        return impressionInning === inning;
      });

      if (inningImpressions.length >= sponsor.exposureLimits.maxPerInning) {
        return false;
      }
    }

    if (sponsor.exposureLimits.maxDurationSeconds !== undefined) {
      const totalDuration = scopedImpressions.reduce((sum, impression) => sum + (impression.durationSeconds ?? this.inferDurationSeconds(impression, now)), 0);

      if (totalDuration >= sponsor.exposureLimits.maxDurationSeconds) {
        return false;
      }
    }

    return true;
  }

  private withinCooldown(sponsor: Sponsor, now: Date): boolean {
    const minSecondsBetween = sponsor.exposureLimits.minSecondsBetween;

    if (minSecondsBetween === undefined) {
      return true;
    }

    const { gameId } = this.resolutionContext;
    const relevantImpressions = this.impressions
      .filter((impression) => impression.sponsorId === sponsor.sponsorId)
      .filter((impression) => !gameId || impression.gameId === gameId)
      .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt));

    const latestImpression = relevantImpressions[0];

    if (!latestImpression) {
      return true;
    }

    const lastTimestamp = Date.parse(latestImpression.endedAt ?? latestImpression.startedAt);

    if (Number.isNaN(lastTimestamp)) {
      return true;
    }

    const elapsedSeconds = Math.max(0, (now.getTime() - lastTimestamp) / 1000);
    return elapsedSeconds >= minSecondsBetween;
  }

  private weightedSelect(candidates: Array<{ sponsor: Sponsor; campaign: Campaign }>): { sponsor: Sponsor; campaign: Campaign } | null {
    if (candidates.length === 0) {
      return null;
    }

    const normalizedWeights = candidates.map((candidate) => Math.max(0, candidate.sponsor.weight));
    const totalWeight = normalizedWeights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight <= 0) {
      return candidates[0] ?? null;
    }

    let threshold = Math.random() * totalWeight;

    for (const [index, candidate] of candidates.entries()) {
      threshold -= normalizedWeights[index];
      if (threshold < 0) {
        return candidate;
      }
    }

    return candidates.at(-1) ?? null;
  }

  private removeCandidate(pool: SponsorCandidate[], candidate: SponsorCandidate): void {
    const index = pool.findIndex(
      (currentCandidate) =>
        currentCandidate.sponsor.sponsorId === candidate.sponsor.sponsorId && currentCandidate.campaign.campaignId === candidate.campaign.campaignId,
    );

    if (index >= 0) {
      pool.splice(index, 1);
    }
  }

  private inferDurationSeconds(impression: Impression, fallbackNow: Date): number {
    const startedAt = Date.parse(impression.startedAt);
    const endedAt = Date.parse(impression.endedAt ?? fallbackNow.toISOString());

    if (Number.isNaN(startedAt) || Number.isNaN(endedAt)) {
      return 0;
    }

    return Math.max(0, Math.round((endedAt - startedAt) / 1000));
  }

  private readNumericContext(impression: Impression, key: string): number | null {
    const candidate = impression as Impression & { [contextKey: string]: unknown };
    return typeof candidate[key] === 'number' ? candidate[key] : null;
  }

  private resolveDuration(impression: Omit<Impression, 'impressionId'>): number | undefined {
    if (impression.durationSeconds !== undefined) {
      return impression.durationSeconds;
    }

    if (!impression.endedAt) {
      return undefined;
    }

    const startedAt = Date.parse(impression.startedAt);
    const endedAt = Date.parse(impression.endedAt);

    if (Number.isNaN(startedAt) || Number.isNaN(endedAt)) {
      return undefined;
    }

    return Math.max(0, Math.round((endedAt - startedAt) / 1000));
  }

  private now(): Date {
    return new Date();
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
