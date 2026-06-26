import type { GameEvent } from '@mineros/game-engine';

import type { EventEngineRequest, EventMode, OverlayRequest, SceneRequest, SponsorRequest, SupportedEventType } from './types';
import { SUPPORTED_EVENT_TYPES } from './types';

type RequestFactoryContext = {
  event: GameEvent;
  nextRequestId: () => string;
};

type RequestFactory = (context: RequestFactoryContext) => EventEngineRequest;

const DEFAULT_MODE: EventMode = 'preview';

function cloneRecord(record: Record<string, unknown>): Record<string, unknown> {
  return { ...record };
}

function createOverlayRequest(
  event: GameEvent,
  nextRequestId: () => string,
  input: Omit<OverlayRequest, 'requestId' | 'source' | 'eventId'>,
): OverlayRequest {
  return {
    requestId: nextRequestId(),
    source: 'EventEngine',
    eventId: event.eventId,
    ...input,
  };
}

function createSceneRequest(
  event: GameEvent,
  nextRequestId: () => string,
  input: Omit<SceneRequest, 'requestId' | 'source' | 'eventId'>,
): SceneRequest {
  return {
    requestId: nextRequestId(),
    source: 'EventEngine',
    eventId: event.eventId,
    ...input,
  };
}

function createSponsorRequest(
  event: GameEvent,
  nextRequestId: () => string,
  input: Omit<SponsorRequest, 'requestId' | 'source' | 'eventId'>,
): SponsorRequest {
  return {
    requestId: nextRequestId(),
    source: 'EventEngine',
    eventId: event.eventId,
    ...input,
  };
}

const EVENT_RULES: Record<SupportedEventType, RequestFactory[]> = {
  batter_changed: [
    ({ event, nextRequestId }) =>
      createOverlayRequest(event, nextRequestId, {
        action: 'showOverlay',
        overlay: 'batter',
        preferredZone: 'B',
        mode: DEFAULT_MODE,
        priority: 80,
        payload: cloneRecord(event.payload),
      }),
    ({ event, nextRequestId }) =>
      createSceneRequest(event, nextRequestId, {
        action: 'requestScene',
        sceneId: 'scene-cambio-bateador',
        mode: DEFAULT_MODE,
        priority: 70,
      }),
  ],
  pitcher_changed: [
    ({ event, nextRequestId }) =>
      createOverlayRequest(event, nextRequestId, {
        action: 'showOverlay',
        overlay: 'pitcher',
        preferredZone: 'B',
        mode: DEFAULT_MODE,
        priority: 85,
        payload: cloneRecord(event.payload),
      }),
    ({ event, nextRequestId }) =>
      createSceneRequest(event, nextRequestId, {
        action: 'requestScene',
        sceneId: 'scene-cambio-pitcher',
        mode: DEFAULT_MODE,
        priority: 75,
      }),
  ],
  inning_started: [
    ({ event, nextRequestId }) =>
      createSceneRequest(event, nextRequestId, {
        action: 'requestScene',
        sceneId: 'scene-inicio-entrada',
        mode: DEFAULT_MODE,
        priority: 90,
      }),
    ({ event, nextRequestId }) =>
      createOverlayRequest(event, nextRequestId, {
        action: 'hideOverlay',
        overlay: 'batter',
        mode: DEFAULT_MODE,
        priority: 80,
      }),
    ({ event, nextRequestId }) =>
      createOverlayRequest(event, nextRequestId, {
        action: 'hideOverlay',
        overlay: 'pitcher',
        mode: DEFAULT_MODE,
        priority: 85,
      }),
  ],
  inning_ended: [
    ({ event, nextRequestId }) =>
      createSceneRequest(event, nextRequestId, {
        action: 'requestScene',
        sceneId: 'scene-fin-entrada',
        mode: DEFAULT_MODE,
        priority: 90,
      }),
    ({ event, nextRequestId }) =>
      createSponsorRequest(event, nextRequestId, {
        action: 'requestSponsor',
        placement: 'sponsor_overlay',
        preferredZone: 'D',
        mode: DEFAULT_MODE,
        context: cloneRecord(event.payload),
      }),
  ],
  home_run: [
    ({ event, nextRequestId }) =>
      createSceneRequest(event, nextRequestId, {
        action: 'requestScene',
        sceneId: 'scene-home-run',
        mode: DEFAULT_MODE,
        priority: 95,
      }),
    ({ event, nextRequestId }) =>
      createSponsorRequest(event, nextRequestId, {
        action: 'requestSponsor',
        placement: 'sponsor_overlay',
        preferredZone: 'D',
        mode: DEFAULT_MODE,
        context: cloneRecord(event.payload),
      }),
  ],
};

export function isSupportedEventType(eventType: string): eventType is SupportedEventType {
  return (SUPPORTED_EVENT_TYPES as readonly string[]).includes(eventType);
}

export function buildRequestsForEvent(event: GameEvent, nextRequestId: () => string): EventEngineRequest[] {
  if (!isSupportedEventType(event.eventType)) {
    return [];
  }

  return EVENT_RULES[event.eventType].map((factory) => factory({ event, nextRequestId }));
}
