import { createHash, randomUUID } from 'crypto';

const DEFAULT_WS_PATH = process.env.ESP32_WS_PATH || '/api/esp32/ws';
const DEFAULT_COMMAND_TIMEOUT_MS = parseInt(process.env.ESP32_COMMAND_TIMEOUT_MS || '5000', 10);

export class ESP32Controller {
  constructor() {
    this.connected = false;
    this.server = null;
    this.socket = null;
    this.socketBuffer = Buffer.alloc(0);
    this.pendingCommands = new Map();
    this.websocketPath = DEFAULT_WS_PATH;
    this.commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS;
    this.lastSeenAt = null;
    this.deviceInfo = null;
    this.lastKnownStatus = null;

    // Retained for compatibility with the existing config route/tests.
    this.esp32Ip = process.env.ESP32_IP || '192.168.1.100';
    this.port = parseInt(process.env.ESP32_PORT || '80', 10);
    this.baseUrl = `http://${this.esp32Ip}:${this.port}`;
  }

  attachServer(server) {
    if (this.server === server) {
      return;
    }

    if (this.server) {
      throw new Error('ESP32Controller is already attached to a server');
    }

    this.server = server;
    this.server.on('upgrade', (request, socket, head) => {
      const [pathname] = (request.url || '').split('?');
      if (pathname !== this.websocketPath) {
        return;
      }

      this.handleUpgrade(request, socket, head);
    });
  }

  handleUpgrade(request, socket, head) {
    const upgradeHeader = request.headers.upgrade;
    const webSocketKey = request.headers['sec-websocket-key'];

    if (upgradeHeader?.toLowerCase() !== 'websocket' || !webSocketKey) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const acceptKey = createHash('sha1')
      .update(`${webSocketKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, 'binary')
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n',
    ];

    socket.write(headers.join('\r\n'));
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 10_000);

    if (this.socket && this.socket !== socket) {
      this.socket.end();
    }

    this.socket = socket;
    this.socketBuffer = Buffer.alloc(0);
    this.connected = true;
    this.lastSeenAt = new Date().toISOString();

    socket.on('data', (chunk) => {
      this.handleSocketData(chunk);
    });

    socket.on('end', () => {
      this.handleDisconnect('ESP32 disconnected');
    });

    socket.on('close', () => {
      this.handleDisconnect('ESP32 socket closed');
    });

    socket.on('error', (error) => {
      console.error('❌ ESP32 websocket error:', error.message);
      this.handleDisconnect(error.message);
    });

    if (head?.length) {
      this.handleSocketData(head);
    }

    console.log('✅ ESP32 websocket connected');
    this.sendJson({
      type: 'hello_ack',
      status: 'connected',
      websocketPath: this.websocketPath,
      serverTime: new Date().toISOString(),
    });
  }

  handleDisconnect(reason = 'Disconnected') {
    if (!this.connected && !this.socket) {
      return;
    }

    this.connected = false;
    this.socket = null;
    this.socketBuffer = Buffer.alloc(0);
    this.lastSeenAt = new Date().toISOString();

    for (const [requestId, pending] of this.pendingCommands.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(`ESP32 connection lost while waiting for ${requestId}: ${reason}`));
      this.pendingCommands.delete(requestId);
    }

    console.log(`⚠️  ESP32 websocket disconnected: ${reason}`);
  }

  handleSocketData(chunk) {
    this.socketBuffer = Buffer.concat([this.socketBuffer, chunk]);

    while (this.socketBuffer.length >= 2) {
      const firstByte = this.socketBuffer[0];
      const secondByte = this.socketBuffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) === 0x80;

      let payloadLength = secondByte & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (this.socketBuffer.length < offset + 2) {
          return;
        }
        payloadLength = this.socketBuffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLength === 127) {
        if (this.socketBuffer.length < offset + 8) {
          return;
        }
        payloadLength = Number(this.socketBuffer.readBigUInt64BE(offset));
        offset += 8;
      }

      const maskLength = isMasked ? 4 : 0;
      const frameLength = offset + maskLength + payloadLength;
      if (this.socketBuffer.length < frameLength) {
        return;
      }

      let payload = this.socketBuffer.subarray(offset + maskLength, frameLength);
      if (isMasked) {
        const maskingKey = this.socketBuffer.subarray(offset, offset + 4);
        const unmaskedPayload = Buffer.alloc(payloadLength);
        for (let index = 0; index < payloadLength; index++) {
          unmaskedPayload[index] = payload[index] ^ maskingKey[index % 4];
        }
        payload = unmaskedPayload;
      }

      this.socketBuffer = this.socketBuffer.subarray(frameLength);
      this.lastSeenAt = new Date().toISOString();

      if (opcode === 0x8) {
        if (this.socket) {
          this.sendFrame(0x8, payload);
          this.socket.end();
        }
        this.handleDisconnect('ESP32 sent close frame');
        return;
      }

      if (opcode === 0x9) {
        this.sendFrame(0xA, payload);
        continue;
      }

      if (opcode === 0xA) {
        continue;
      }

      if (opcode !== 0x1) {
        continue;
      }

      this.handleJsonMessage(payload.toString('utf8'));
    }
  }

  handleJsonMessage(text) {
    try {
      const message = JSON.parse(text);
      switch (message.type) {
        case 'hello':
          this.deviceInfo = message.device || null;
          if (message.status) {
            this.lastKnownStatus = message.status;
          }
          this.sendJson({
            type: 'hello_ack',
            status: 'connected',
            websocketPath: this.websocketPath,
            serverTime: new Date().toISOString(),
          });
          console.log(`🤝 ESP32 identified as ${this.deviceInfo?.name || 'unknown device'}`);
          break;

        case 'status_update':
          this.deviceInfo = message.device || this.deviceInfo;
          this.lastKnownStatus = message.status || this.lastKnownStatus;
          break;

        case 'command_result':
          this.deviceInfo = message.device || this.deviceInfo;
          if (message.status) {
            this.lastKnownStatus = message.status;
          }
          this.resolvePendingCommand(message);
          break;

        case 'log':
          console.log(`📟 ESP32: ${message.message || text}`);
          break;

        default:
          console.log(`ℹ️  ESP32 message received: ${text}`);
      }
    } catch (error) {
      console.error('❌ Failed to parse ESP32 websocket message:', error.message);
    }
  }

  resolvePendingCommand(message) {
    const pending = this.pendingCommands.get(message.requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingCommands.delete(message.requestId);

    if (message.success === false) {
      pending.reject(new Error(message.message || 'ESP32 command failed'));
      return;
    }

    pending.resolve(message);
  }

  sendFrame(opcode, payload = Buffer.alloc(0)) {
    if (!this.socket || this.socket.destroyed) {
      throw new Error('ESP32 websocket is not connected');
    }

    const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const payloadLength = payloadBuffer.length;

    let header;
    if (payloadLength < 126) {
      header = Buffer.alloc(2);
      header[1] = payloadLength;
    } else if (payloadLength < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(payloadLength, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(payloadLength), 2);
    }

    header[0] = 0x80 | opcode;
    this.socket.write(Buffer.concat([header, payloadBuffer]));
  }

  sendJson(message) {
    this.sendFrame(0x1, Buffer.from(JSON.stringify(message)));
  }

  isConnected() {
    return this.connected;
  }

  async unlockDoor(row, column) {
    return this.sendCommand('unlock', row, column);
  }

  async lockDoor(row, column) {
    return this.sendCommand('lock', row, column);
  }

  async sendCommand(action, row, column) {
    console.log(`${action === 'unlock' ? '🚪' : '🔒'} Attempting to ${action} door at Row ${row}, Column ${column}`);

    if (!this.connected) {
      throw new Error(`ESP32 websocket is not connected; cannot ${action} door`);
    }

    const requestId = randomUUID();
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(requestId);
        reject(new Error(`ESP32 ${action} timed out after ${this.commandTimeoutMs}ms`));
      }, this.commandTimeoutMs);

      this.pendingCommands.set(requestId, {
        resolve: (message) => {
          const duration = Date.now() - startedAt;
          resolve({
            status: 'success',
            message: message.message || `Door ${action}ed successfully`,
            row,
            column,
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            esp32Response: message,
          });
        },
        reject,
        timeout,
      });

      try {
        this.sendJson({
          type: 'command',
          requestId,
          action,
          row,
          column,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        clearTimeout(timeout);
        this.pendingCommands.delete(requestId);
        reject(error);
      }
    });
  }

  async getStatus() {
    if (!this.connected) {
      return {
        status: 'disconnected',
        message: 'ESP32 not connected',
        websocketPath: this.websocketPath,
        lastSeenAt: this.lastSeenAt,
      };
    }

    return {
      status: 'connected',
      connection: 'websocket',
      websocketPath: this.websocketPath,
      esp32Status: this.lastKnownStatus,
      device: this.deviceInfo,
      lastSeenAt: this.lastSeenAt,
      timestamp: new Date().toISOString(),
    };
  }

  setESP32IP(newIp, port = 80) {
    this.esp32Ip = newIp;
    this.port = port;
    this.baseUrl = `http://${newIp}:${port}`;
    console.log(`📡 Stored ESP32 HTTP config for compatibility: ${this.baseUrl}`);
  }
}

export const esp32Controller = new ESP32Controller();
