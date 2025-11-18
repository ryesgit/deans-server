// Mock utilities for Axios (ESP32 HTTP requests)

import { jest } from '@jest/globals';

export const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
};

export const resetAxiosMocks = () => {
  mockAxios.get.mockReset();
  mockAxios.post.mockReset();
};

// Mock ESP32 responses
export const mockESP32Responses = {
  health: {
    data: {
      status: 'ok',
      uptime: 12345,
      timestamp: new Date().toISOString(),
    },
  },
  status: {
    data: {
      doorStatus: 'locked',
      lastAction: 'lock',
      timestamp: new Date().toISOString(),
    },
  },
  unlock: {
    data: {
      status: 'success',
      message: 'Door unlocked successfully',
      row: 1,
      column: 3,
    },
  },
  lock: {
    data: {
      status: 'success',
      message: 'Door locked successfully',
      row: 1,
      column: 3,
    },
  },
};

// Helper to simulate ESP32 connection failure
export const mockESP32ConnectionError = () => {
  const error = new Error('ESP32 connection failed');
  error.code = 'ECONNREFUSED';
  return error;
};

// Helper to simulate ESP32 timeout
export const mockESP32TimeoutError = () => {
  const error = new Error('ESP32 request timeout');
  error.code = 'ETIMEDOUT';
  return error;
};
