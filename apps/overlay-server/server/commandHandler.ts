import { stateStore, type CommandResult } from './stateStore';

export interface CommandRequest {
  command: string;
  value?: string;
}

export interface CommandResponse {
  command: string;
  value?: string;
  payload: unknown;
}

export function parseCommandRequest(body: unknown): CommandRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const { command, value } = body as { command?: unknown; value?: unknown };

  if (typeof command !== 'string' || command.trim().length === 0) {
    throw new Error('command must be a non-empty string');
  }

  if (value !== undefined && typeof value !== 'string') {
    throw new Error('value must be a string when provided');
  }

  return {
    command: command.trim(),
    value: typeof value === 'string' ? value : undefined,
  };
}

export function handleCommand(command: string, value?: string): CommandResponse {
  const result: CommandResult = stateStore.sendCommand(command, value);

  return {
    command: result.command,
    value: result.value,
    payload: result.data,
  };
}
