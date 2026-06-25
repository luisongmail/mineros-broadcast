import { afterEach, describe, expect, it, vi } from 'vitest';

import { SponsorEngine } from './SponsorEngine';
import type { Campaign, Sponsor, SponsorRequest } from './types';

const ACTIVE_WINDOW = {
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T23:59:59.999Z',
};

function createSponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    sponsorId: 'sponsor-001',
    name: 'Sponsor Uno',
    brand: 'Mineros Cola',
    assetId: 'asset-001',
    status: 'active',
    priority: 90,
    weight: 5,
    allowedPlacements: ['scorebug', 'ticker'],
    campaignIds: ['campaign-001'],
    startDate: ACTIVE_WINDOW.startDate,
    endDate: ACTIVE_WINDOW.endDate,
    exposureLimits: {},
    blackoutRules: [],
    metadata: {
      owner: 'ventas',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

function createCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaignId: 'campaign-001',
    name: 'Campaña principal',
    sponsorIds: ['sponsor-001'],
    status: 'active',
    placements: ['scorebug', 'ticker'],
    startDate: ACTIVE_WINDOW.startDate,
    endDate: ACTIVE_WINDOW.endDate,
    rules: {
      rotationMode: 'weighted',
      allowDuringLivePlay: true,
      allowBetweenInnings: true,
    },
    ...overrides,
  };
}

function createRequest(overrides: Partial<SponsorRequest> = {}): SponsorRequest {
  return {
    requestId: 'request-001',
    trigger: 'auto-scorebug',
    requestedPlacement: 'scorebug',
    mode: 'program',
    context: {
      gameId: 'game-001',
      inning: 1,
    },
    ...overrides,
  };
}

describe('SponsorEngine', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resolve() retorna null cuando no hay sponsors', () => {
    const engine = new SponsorEngine();

    const decision = engine.resolve(createRequest());

    expect(decision).toMatchObject({
      sponsorId: null,
      campaignId: null,
      assetId: null,
      eligible: false,
      placement: 'scorebug',
    });
  });

  it('resolve() retorna sponsor activo elegible', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T12:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const engine = new SponsorEngine();
    engine.addSponsor(createSponsor());
    engine.addCampaign(createCampaign());

    const decision = engine.resolve(createRequest());

    expect(decision).toMatchObject({
      sponsorId: 'sponsor-001',
      campaignId: 'campaign-001',
      assetId: 'asset-001',
      eligible: true,
      reason: 'Sponsor elegible seleccionado',
    });
  });

  it('resolve() respeta límite maxPerGame', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T12:00:00.000Z'));

    const engine = new SponsorEngine();
    engine.addSponsor(createSponsor({ exposureLimits: { maxPerGame: 1 } }));
    engine.addCampaign(createCampaign());
    engine.recordImpression({
      sponsorId: 'sponsor-001',
      campaignId: 'campaign-001',
      placement: 'scorebug',
      gameId: 'game-001',
      startedAt: '2026-06-24T11:58:00.000Z',
      endedAt: '2026-06-24T11:58:10.000Z',
      trigger: 'automatic',
    });

    const decision = engine.resolve(createRequest());

    expect(decision).toMatchObject({
      sponsorId: null,
      eligible: false,
    });
    expect(decision.reason).toContain('excedió sus límites de exposición');
  });

  it('resolve() respeta cooldown minSecondsBetween', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T12:00:20.000Z'));

    const engine = new SponsorEngine();
    engine.addSponsor(createSponsor({ exposureLimits: { minSecondsBetween: 60 } }));
    engine.addCampaign(createCampaign());
    engine.recordImpression({
      sponsorId: 'sponsor-001',
      campaignId: 'campaign-001',
      placement: 'scorebug',
      gameId: 'game-001',
      startedAt: '2026-06-24T12:00:00.000Z',
      endedAt: '2026-06-24T12:00:05.000Z',
      trigger: 'automatic',
    });

    const decision = engine.resolve(createRequest());

    expect(decision).toMatchObject({
      sponsorId: null,
      eligible: false,
    });
    expect(decision.reason).toContain('cooldown');
  });

  it('addSponsor / getSponsor funcionan correctamente', () => {
    const engine = new SponsorEngine();
    engine.addSponsor(createSponsor());

    const sponsor = engine.getSponsor('sponsor-001');

    expect(sponsor).toEqual(createSponsor());
  });

  it('recordImpression registra la impresión y getImpressions la devuelve', () => {
    const engine = new SponsorEngine();

    const impression = engine.recordImpression({
      sponsorId: 'sponsor-001',
      campaignId: 'campaign-001',
      placement: 'scorebug',
      zoneId: 'zone-main',
      sceneId: 'scene-scorebug',
      gameId: 'game-001',
      startedAt: '2026-06-24T12:00:00.000Z',
      endedAt: '2026-06-24T12:00:15.000Z',
      trigger: 'manual',
    });

    expect(impression).toMatchObject({
      impressionId: 'impression-000001',
      durationSeconds: 15,
    });
    expect(engine.getImpressions({ sponsorId: 'sponsor-001', gameId: 'game-001' })).toEqual([impression]);
  });
});
