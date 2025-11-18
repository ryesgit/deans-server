import axios from 'axios';

export class ESP32Controller {
  constructor(esp32Ip = process.env.ESP32_IP || '192.168.1.100', port = process.env.ESP32_PORT || 80) {
    this.esp32Ip = esp32Ip;
    this.port = port;
    this.baseUrl = `http://${esp32Ip}:${port}`;
    this.timeout = 5000; // 5 seconds timeout
    this.connected = false;
    
    this.checkConnection();
  }

  async checkConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: this.timeout
      });
      this.connected = true;
      console.log('✅ ESP32 connected successfully');
      return true;
    } catch (error) {
      this.connected = false;
      console.log('⚠️  ESP32 not connected, using simulation mode');
      return false;
    }
  }

  isConnected() {
    return this.connected;
  }

  async unlockDoor(row, column) {
    const payload = {
      command: 'unlock',
      row: row,
      column: column,
      timestamp: new Date().toISOString()
    };

    console.log(`🚪 Attempting to unlock door at Row ${row}, Column ${column}`);

    if (!this.connected) {
      console.log('📡 ESP32 not connected, simulating unlock...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        status: 'simulated',
        message: `Simulated unlock for Row ${row}, Column ${column}`,
        row: row,
        column: column,
        timestamp: new Date().toISOString(),
        duration: '1000ms'
      };
    }

    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${this.baseUrl}/unlock`, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const duration = Date.now() - startTime;

      console.log(`✅ Door unlocked successfully in ${duration}ms`);

      return {
        status: 'success',
        message: response.data.message || 'Door unlocked successfully',
        row: row,
        column: column,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        esp32Response: response.data
      };

    } catch (error) {
      console.error('❌ ESP32 unlock failed:', error.message);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.connected = false;
        throw new Error(`ESP32 connection failed: ${error.message}`);
      }
      
      throw new Error(`ESP32 unlock error: ${error.response?.data?.message || error.message}`);
    }
  }

  async lockDoor(row, column) {
    const payload = {
      command: 'lock',
      row: row,
      column: column,
      timestamp: new Date().toISOString()
    };

    console.log(`🔒 Attempting to lock door at Row ${row}, Column ${column}`);

    if (!this.connected) {
      console.log('📡 ESP32 not connected, simulating lock...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        status: 'simulated',
        message: `Simulated lock for Row ${row}, Column ${column}`,
        row: row,
        column: column,
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/lock`, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('🔒 Door locked successfully');

      return {
        status: 'success',
        message: response.data.message || 'Door locked successfully',
        row: row,
        column: column,
        timestamp: new Date().toISOString(),
        esp32Response: response.data
      };

    } catch (error) {
      console.error('❌ ESP32 lock failed:', error.message);
      throw new Error(`ESP32 lock error: ${error.response?.data?.message || error.message}`);
    }
  }

  async getStatus() {
    if (!this.connected) {
      return {
        status: 'disconnected',
        message: 'ESP32 not connected',
        simulation: true
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/status`, {
        timeout: this.timeout
      });

      return {
        status: 'connected',
        esp32Status: response.data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.connected = false;
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  setESP32IP(newIp, port = 80) {
    this.esp32Ip = newIp;
    this.port = port;
    this.baseUrl = `http://${newIp}:${port}`;
    console.log(`📡 ESP32 IP updated to: ${this.baseUrl}`);
    this.checkConnection();
  }
}