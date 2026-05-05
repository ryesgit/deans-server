import { jest } from '@jest/globals';
import { ESP32Controller } from '../../esp32Controller.js';

describe('ESP32Controller', () => {
  let controller;

  beforeEach(() => {
    jest.useRealTimers();
    controller = new ESP32Controller();
  });

  afterEach(() => {
    for (const pending of controller.pendingCommands.values()) {
      clearTimeout(pending.timeout);
    }
    controller.pendingCommands.clear();
  });

  describe('Disconnected Mode', () => {
    test('should initialize as disconnected when no ESP32 websocket is attached', () => {
      expect(controller.isConnected()).toBe(false);
    });

    test('should fail unlock when ESP32 websocket is not connected', async () => {
      await expect(controller.unlockDoor(1, 3)).rejects.toThrow(
        'ESP32 websocket is not connected; cannot unlock door',
      );
    });

    test('should fail lock when ESP32 websocket is not connected', async () => {
      await expect(controller.lockDoor(2, 4)).rejects.toThrow(
        'ESP32 websocket is not connected; cannot lock door',
      );
    });

    test('should return disconnected status', async () => {
      const result = await controller.getStatus();

      expect(result.status).toBe('disconnected');
      expect(result.message).toBe('ESP32 not connected');
      expect(result.websocketPath).toBe('/api/esp32/ws');
    });
  });

  describe('Connected Mode', () => {
    beforeEach(() => {
      controller.connected = true;
    });

    test('should unlock door when ESP32 returns command success', async () => {
      let sentCommand;
      controller.sendJson = jest.fn((message) => {
        sentCommand = message;
        queueMicrotask(() => {
          controller.resolvePendingCommand({
            type: 'command_result',
            requestId: message.requestId,
            success: true,
            message: 'Door unlocked successfully',
            status: { lockState: 'open' },
          });
        });
      });

      const result = await controller.unlockDoor(1, 3);

      expect(sentCommand).toMatchObject({
        type: 'command',
        action: 'unlock',
        row: 1,
        column: 3,
      });
      expect(result.status).toBe('success');
      expect(result.message).toBe('Door unlocked successfully');
      expect(result.row).toBe(1);
      expect(result.column).toBe(3);
    });

    test('should lock door when ESP32 returns command success', async () => {
      controller.sendJson = jest.fn((message) => {
        queueMicrotask(() => {
          controller.resolvePendingCommand({
            type: 'command_result',
            requestId: message.requestId,
            success: true,
            message: 'Door locked successfully',
          });
        });
      });

      const result = await controller.lockDoor(2, 4);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Door locked successfully');
      expect(result.row).toBe(2);
      expect(result.column).toBe(4);
    });

    test('should reject when ESP32 returns command failure', async () => {
      controller.sendJson = jest.fn((message) => {
        queueMicrotask(() => {
          controller.resolvePendingCommand({
            type: 'command_result',
            requestId: message.requestId,
            success: false,
            message: 'Lock actuator failed',
          });
        });
      });

      await expect(controller.unlockDoor(1, 3)).rejects.toThrow('Lock actuator failed');
    });

    test('should reject when ESP32 command times out', async () => {
      controller.commandTimeoutMs = 5;
      controller.sendJson = jest.fn();

      await expect(controller.unlockDoor(1, 3)).rejects.toThrow(
        'ESP32 unlock timed out after 5ms',
      );
    });

    test('should return connected status', async () => {
      controller.deviceInfo = { name: 'Test ESP32' };
      controller.lastKnownStatus = { lockState: 'closed' };

      const result = await controller.getStatus();

      expect(result.status).toBe('connected');
      expect(result.connection).toBe('websocket');
      expect(result.device).toEqual({ name: 'Test ESP32' });
      expect(result.esp32Status).toEqual({ lockState: 'closed' });
    });
  });

  describe('Configuration', () => {
    test('should update ESP32 compatibility IP and port', () => {
      controller.setESP32IP('192.168.1.200', 8080);

      expect(controller.esp32Ip).toBe('192.168.1.200');
      expect(controller.port).toBe(8080);
      expect(controller.baseUrl).toBe('http://192.168.1.200:8080');
    });

    test('should use default compatibility port when not specified', () => {
      controller.setESP32IP('192.168.1.150');

      expect(controller.port).toBe(80);
      expect(controller.baseUrl).toBe('http://192.168.1.150:80');
    });
  });
});
