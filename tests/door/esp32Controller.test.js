import { jest } from '@jest/globals';
import { mockAxios, mockESP32Responses, mockESP32ConnectionError, resetAxiosMocks } from '../utils/axiosMock.js';

// Mock axios module
jest.unstable_mockModule('axios', () => ({
  default: mockAxios,
}));

// Import ESP32Controller after mocking
const { ESP32Controller } = await import('../../esp32Controller.js');

describe('ESP32Controller', () => {
  let controller;

  beforeEach(() => {
    resetAxiosMocks();
    // Mock health check to fail by default (simulation mode)
    mockAxios.get.mockRejectedValue(mockESP32ConnectionError());
  });

  describe('Simulation Mode', () => {
    beforeEach(async () => {
      controller = new ESP32Controller();
      // Wait for constructor's checkConnection to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should initialize in simulation mode when ESP32 is not connected', () => {
      expect(controller.isConnected()).toBe(false);
    });

    test('should simulate unlock in simulation mode', async () => {
      const result = await controller.unlockDoor(1, 3);

      expect(result.status).toBe('simulated');
      expect(result.message).toContain('Simulated unlock');
      expect(result.row).toBe(1);
      expect(result.column).toBe(3);
      expect(result.timestamp).toBeDefined();
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    test('should simulate lock in simulation mode', async () => {
      const result = await controller.lockDoor(2, 4);

      expect(result.status).toBe('simulated');
      expect(result.message).toContain('Simulated lock');
      expect(result.row).toBe(2);
      expect(result.column).toBe(4);
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    test('should return disconnected status in simulation mode', async () => {
      const result = await controller.getStatus();

      expect(result.status).toBe('disconnected');
      expect(result.message).toBe('ESP32 not connected');
      expect(result.simulation).toBe(true);
    });
  });

  describe('Connected Mode', () => {
    beforeEach(async () => {
      // Mock successful health check
      mockAxios.get.mockResolvedValue(mockESP32Responses.health);
      controller = new ESP32Controller();
      // Wait for constructor's checkConnection to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should initialize as connected when ESP32 responds to health check', () => {
      expect(controller.isConnected()).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ timeout: 5000 })
      );
    });

    test('should unlock door successfully when connected', async () => {
      mockAxios.post.mockResolvedValue(mockESP32Responses.unlock);

      const result = await controller.unlockDoor(1, 3);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Door unlocked successfully');
      expect(result.row).toBe(1);
      expect(result.column).toBe(3);
      expect(result.duration).toBeDefined();
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/unlock'),
        expect.objectContaining({
          command: 'unlock',
          row: 1,
          column: 3,
        }),
        expect.any(Object)
      );
    });

    test('should lock door successfully when connected', async () => {
      mockAxios.post.mockResolvedValue(mockESP32Responses.lock);

      const result = await controller.lockDoor(2, 4);

      expect(result.status).toBe('success');
      expect(result.message).toBe('Door locked successfully');
      expect(result.row).toBe(2);
      expect(result.column).toBe(4);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/lock'),
        expect.objectContaining({
          command: 'lock',
          row: 2,
          column: 4,
        }),
        expect.any(Object)
      );
    });

    test('should get ESP32 status when connected', async () => {
      mockAxios.get.mockResolvedValue(mockESP32Responses.status);

      const result = await controller.getStatus();

      expect(result.status).toBe('connected');
      expect(result.esp32Status).toEqual(mockESP32Responses.status.data);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      // Start in connected mode
      mockAxios.get.mockResolvedValue(mockESP32Responses.health);
      controller = new ESP32Controller();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should throw error when unlock fails with connection refused', async () => {
      mockAxios.post.mockRejectedValue(mockESP32ConnectionError());

      await expect(controller.unlockDoor(1, 3)).rejects.toThrow('ESP32 connection failed');
      expect(controller.isConnected()).toBe(false);
    });

    test('should throw error when unlock fails with timeout', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockAxios.post.mockRejectedValue(timeoutError);

      await expect(controller.unlockDoor(1, 3)).rejects.toThrow('ESP32 connection failed');
      expect(controller.isConnected()).toBe(false);
    });

    test('should throw error when unlock fails with response error', async () => {
      const error = new Error('ESP32 Error');
      error.response = { data: { message: 'Invalid command' } };
      mockAxios.post.mockRejectedValue(error);

      await expect(controller.unlockDoor(1, 3)).rejects.toThrow('Invalid command');
    });

    test('should mark as disconnected when status check fails', async () => {
      mockAxios.get.mockRejectedValue(new Error('Connection failed'));

      const result = await controller.getStatus();

      expect(result.status).toBe('error');
      expect(result.message).toBe('Connection failed');
      expect(controller.isConnected()).toBe(false);
    });

    test('should throw error when lock fails', async () => {
      const error = new Error('Lock failed');
      error.response = { data: { message: 'Hardware error' } };
      mockAxios.post.mockRejectedValue(error);

      await expect(controller.lockDoor(1, 1)).rejects.toThrow('Hardware error');
    });
  });

  describe('Configuration', () => {
    beforeEach(async () => {
      mockAxios.get.mockRejectedValue(mockESP32ConnectionError());
      controller = new ESP32Controller();
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should update ESP32 IP address', async () => {
      // Mock successful connection after IP change
      mockAxios.get.mockResolvedValue(mockESP32Responses.health);

      controller.setESP32IP('192.168.1.200', 8080);

      expect(controller.esp32Ip).toBe('192.168.1.200');
      expect(controller.port).toBe(8080);
      expect(controller.baseUrl).toBe('http://192.168.1.200:8080');

      // Wait for checkConnection to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should use default port when not specified', async () => {
      controller.setESP32IP('192.168.1.150');

      expect(controller.port).toBe(80);
      expect(controller.baseUrl).toBe('http://192.168.1.150:80');
    });
  });
});
