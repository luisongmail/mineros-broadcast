import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { OverlaySnapshotEnvelope } from '../types';

interface SupabaseRealtimeOptions {
  channelName?: string;
  onSnapshot: (snapshot: OverlaySnapshotEnvelope) => void;
}

export class SupabaseRealtimeService {
  private readonly channelName: string;
  private readonly onSnapshot: (snapshot: OverlaySnapshotEnvelope) => void;
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private enabled = false;

  constructor(options: SupabaseRealtimeOptions) {
    this.channelName = options.channelName ?? 'overlay-server-events';
    this.onSnapshot = options.onSnapshot;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async start(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[overlay-server] Supabase Realtime deshabilitado: faltan SUPABASE_URL o SUPABASE_KEY.');
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    this.channel = this.client.channel(this.channelName, {
      config: {
        broadcast: {
          ack: true,
          self: true,
        },
      },
    });

    this.channel.on('broadcast', { event: 'snapshot' }, ({ payload }) => {
      console.info('[overlay-server] Snapshot recibido desde Supabase Realtime.');
      this.onSnapshot(payload as OverlaySnapshotEnvelope);
    });

    await new Promise<void>((resolve) => {
      this.channel?.subscribe((status) => {
        console.info(`[overlay-server] Estado Realtime Supabase: ${status}.`);

        if (status === 'SUBSCRIBED') {
          this.enabled = true;
          resolve();
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.enabled = false;
          resolve();
        }
      });
    });
  }

  async publishSnapshot(snapshot: OverlaySnapshotEnvelope): Promise<boolean> {
    if (!this.channel || !this.enabled) {
      return false;
    }

    const result = await this.channel.send({
      type: 'broadcast',
      event: 'snapshot',
      payload: snapshot,
    });

    if (result !== 'ok') {
      console.warn(`[overlay-server] No se pudo publicar snapshot en Supabase Realtime: ${result}.`);
      return false;
    }

    return true;
  }
}
