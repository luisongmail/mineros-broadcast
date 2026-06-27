import type { GameEvent } from '@playflow/game-engine';

import { buildRequestsForEvent, isSupportedEventType } from './rules';
import type { EventAction, EventAudit, EventEngineListener, EventEngineOutput, EventEngineRequest } from './types';

const REQUIRED_FIELDS = ['eventId', 'eventType', 'gameId', 'timestamp', 'source'] as const;

export class EventEngine {
  private requestCounter = 0;
  private auditCounter = 0;
  private readonly auditLog: EventAudit[] = [];
  private readonly listeners = new Set<EventEngineListener>();
  private receivedAt: string | null = null;

  process(event: GameEvent): EventEngineOutput {
    this.receivedAt = this.now();

    const rejectionReason = this.validate(event);
    const requests = rejectionReason ? [] : this.buildRequests(event);
    const result = rejectionReason ? 'rejected' : requests.length > 0 ? 'request_sent' : 'no_action';
    const audit = this.buildAudit(event, result, requests, rejectionReason ?? undefined);

    this.auditLog.push(audit);

    const output: EventEngineOutput = {
      eventId: this.readString(event, 'eventId'),
      eventType: this.readString(event, 'eventType'),
      requests: this.cloneRequests(requests),
      audit: { ...audit },
    };

    this.listeners.forEach((listener) => listener(this.cloneOutput(output)));
    this.receivedAt = null;

    return output;
  }

  on(listener: EventEngineListener): void {
    this.listeners.add(listener);
  }

  off(listener: EventEngineListener): void {
    this.listeners.delete(listener);
  }

  getAuditLog(): EventAudit[] {
    return this.auditLog.map((audit) => ({ ...audit }));
  }

  private validate(event: GameEvent): string | null {
    if (!event || typeof event !== 'object') {
      return 'El evento debe ser un objeto válido.';
    }

    for (const field of REQUIRED_FIELDS) {
      if (this.readString(event, field).trim().length === 0) {
        return `El campo '${field}' es obligatorio.`;
      }
    }

    if (!isSupportedEventType(this.readString(event, 'eventType'))) {
      return `El eventType '${this.readString(event, 'eventType')}' no está soportado en V1.`;
    }

    return null;
  }

  private buildRequests(event: GameEvent): EventEngineRequest[] {
    return buildRequestsForEvent(event, () => this.nextRequestId());
  }

  private buildAudit(
    event: GameEvent,
    result: 'request_sent' | 'no_action' | 'rejected',
    requests: EventEngineRequest[],
    rejectionReason?: string,
  ): EventAudit {
    const processedAt = this.now();
    const primaryRequest = requests[0];

    return {
      auditId: this.nextAuditId(),
      eventId: this.readString(event, 'eventId'),
      eventType: this.readString(event, 'eventType'),
      receivedAt: this.receivedAt ?? processedAt,
      processedAt,
      result,
      target: primaryRequest ? this.resolveTarget(primaryRequest.action) : undefined,
      action: primaryRequest?.action,
      mode: primaryRequest?.mode,
      rejectionReason,
    };
  }

  private nextRequestId(): string {
    this.requestCounter += 1;
    return `request-${String(this.requestCounter).padStart(6, '0')}`;
  }

  private nextAuditId(): string {
    this.auditCounter += 1;
    return `audit-${String(this.auditCounter).padStart(6, '0')}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  private resolveTarget(action: EventAction): string {
    switch (action) {
      case 'showOverlay':
      case 'hideOverlay':
      case 'updateTicker':
        return 'LayoutManager';
      case 'requestScene':
        return 'SceneEngine';
      case 'requestSponsor':
        return 'SponsorEngine';
      case 'noAction':
        return 'EventEngine';
    }
  }

  private readString(event: unknown, field: string): string {
    if (typeof event !== 'object' || event === null || !(field in event)) {
      return '';
    }

    const value = (event as Record<string, unknown>)[field];
    return typeof value === 'string' ? value : '';
  }

  private cloneRequests(requests: EventEngineRequest[]): EventEngineRequest[] {
    return requests.map((request) => {
      if (request.action === 'requestScene') {
        return { ...request };
      }

      if (request.action === 'requestSponsor') {
        return {
          ...request,
          context: request.context ? { ...request.context } : undefined,
        };
      }

      return {
        ...request,
        payload: request.payload ? { ...request.payload } : undefined,
      };
    });
  }

  private cloneOutput(output: EventEngineOutput): EventEngineOutput {
    return {
      ...output,
      requests: this.cloneRequests(output.requests),
      audit: { ...output.audit },
    };
  }
}
