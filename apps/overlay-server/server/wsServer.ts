import type { Server as HttpServer } from 'node:http';

import { WebSocket, WebSocketServer } from 'ws';

import { handleCommand, parseCommandRequest } from './commandHandler';
import { stateStore, type StoreMessage } from './stateStore';

interface WebSocketErrorPayload {
  message: string;
}

function sendJson(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(clients: Iterable<WebSocket>, message: StoreMessage): void {
  const serialized = JSON.stringify(message);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  }
}

function toErrorMessage(error: unknown): WebSocketErrorPayload {
  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unknown WebSocket error' };
}

export function attachWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server });

  stateStore.subscribe((message) => {
    broadcast(wss.clients, message);
  });

  wss.on('connection', (socket) => {
    sendJson(socket, {
      type: 'state',
      payload: stateStore.getState(),
    });

    socket.on('message', (rawData) => {
      try {
        const parsedBody = JSON.parse(rawData.toString()) as unknown;
        const { command, value } = parseCommandRequest(parsedBody);
        const response = handleCommand(command, value);

        sendJson(socket, {
          type: 'response',
          payload: response.payload,
          command: response.command,
          value: response.value,
        });
      } catch (error) {
        sendJson(socket, {
          type: 'error',
          payload: toErrorMessage(error),
        });
      }
    });
  });

  return wss;
}
