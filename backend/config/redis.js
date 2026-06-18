/**
 * Redis Client Configuration
 *
 * Centralized Redis client for rate limiting and caching
 * Falls back to in-memory storage if Redis is unavailable
 */

const redis = require("redis");

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.fallbackMode = false;
    this.memoryStore = new Map(); // Fallback in-memory store
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      let redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      // Fix IPv6 resolution issue in Node.js v17+:
      // 'localhost' may resolve to '::1' (IPv6) but Redis typically binds to 127.0.0.1 (IPv4)
      if (redisUrl.includes('localhost')) {
        redisUrl = redisUrl.replace(/localhost/g, '127.0.0.1');
      }

      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeoutMs: 3000, // 3 second connection timeout
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.log(
                "[Redis] ⚠️  Max reconnection attempts reached, switching to fallback mode"
              );
              this.fallbackMode = true;
              return false; // Stop reconnecting
            }
            // Exponential backoff: 200ms * 2^retries, max 2000ms
            return Math.min(200 * Math.pow(2, retries), 2000);
          },
        },
        // Enable offline queue to buffer commands when disconnected
        enableOfflineQueue: false, // Disable to avoid queuing when Redis is down
      });

      // Connection event handlers
      this.client.on("connect", () => {
        console.log("[Redis] 🔄 Connecting to Redis...");
      });

      this.client.on("ready", () => {
        console.log("[Redis] ✅ Redis client connected and ready");
        this.isConnected = true;
        this.fallbackMode = false;
      });

      this.client.on("error", (err) => {
        console.error("[Redis] ❌ Redis client error:", err.message);
        this.fallbackMode = true;
      });

      this.client.on("end", () => {
        console.log("[Redis] 🔌 Redis client disconnected");
        this.isConnected = false;
        this.fallbackMode = true;
      });

      this.client.on("reconnecting", () => {
        console.log("[Redis] 🔄 Reconnecting to Redis...");
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      console.error("[Redis] ❌ Failed to connect to Redis:", error.message);
      console.log("[Redis] ⚠️  Running in FALLBACK MODE (in-memory storage)");
      this.fallbackMode = true;
      this.isConnected = false;
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable() {
    return this.isConnected && !this.fallbackMode && this.client;
  }

  /**
   * Set a key with expiration
   * @param {string} key - The key to set
   * @param {string} value - The value to store
   * @param {number} expirySeconds - Expiration time in seconds
   */
  async set(key, value, expirySeconds = null) {
    try {
      if (this.isAvailable()) {
        if (expirySeconds) {
          await this.client.setEx(key, expirySeconds, value);
        } else {
          await this.client.set(key, value);
        }
      } else {
        // Fallback to in-memory
        this.memoryStore.set(key, {
          value,
          expiry: expirySeconds ? Date.now() + expirySeconds * 1000 : null,
        });
      }
    } catch (error) {
      console.error("[Redis] Error setting key:", error.message);
      // Fallback to in-memory on error
      this.memoryStore.set(key, {
        value,
        expiry: expirySeconds ? Date.now() + expirySeconds * 1000 : null,
      });
    }
  }

  /**
   * Get a value by key
   * @param {string} key - The key to retrieve
   */
  async get(key) {
    try {
      if (this.isAvailable()) {
        return await this.client.get(key);
      } else {
        // Fallback to in-memory
        const item = this.memoryStore.get(key);
        if (!item) return null;

        // Check expiry
        if (item.expiry && Date.now() > item.expiry) {
          this.memoryStore.delete(key);
          return null;
        }

        return item.value;
      }
    } catch (error) {
      console.error("[Redis] Error getting key:", error.message);
      return null;
    }
  }

  /**
   * Delete a key
   * @param {string} key - The key to delete
   */
  async del(key) {
    try {
      if (this.isAvailable()) {
        await this.client.del(key);
      } else {
        this.memoryStore.delete(key);
      }
    } catch (error) {
      console.error("[Redis] Error deleting key:", error.message);
    }
  }

  /**
   * Increment a key
   * @param {string} key - The key to increment
   */
  async incr(key) {
    try {
      if (this.isAvailable()) {
        return await this.client.incr(key);
      } else {
        const item = this.memoryStore.get(key);
        const currentValue = item ? parseInt(item.value) : 0;
        const newValue = currentValue + 1;
        this.memoryStore.set(key, {
          value: String(newValue),
          expiry: item?.expiry || null,
        });
        return newValue;
      }
    } catch (error) {
      console.error("[Redis] Error incrementing key:", error.message);
      return 1;
    }
  }

  /**
   * Set expiration on a key
   * @param {string} key - The key
   * @param {number} seconds - Expiration time in seconds
   */
  async expire(key, seconds) {
    try {
      if (this.isAvailable()) {
        await this.client.expire(key, seconds);
      } else {
        const item = this.memoryStore.get(key);
        if (item) {
          item.expiry = Date.now() + seconds * 1000;
        }
      }
    } catch (error) {
      console.error("[Redis] Error setting expiration:", error.message);
    }
  }

  /**
   * Check if key exists
   * @param {string} key - The key to check
   */
  async exists(key) {
    try {
      if (this.isAvailable()) {
        return (await this.client.exists(key)) === 1;
      } else {
        const item = this.memoryStore.get(key);
        if (!item) return false;

        // Check expiry
        if (item.expiry && Date.now() > item.expiry) {
          this.memoryStore.delete(key);
          return false;
        }

        return true;
      }
    } catch (error) {
      console.error("[Redis] Error checking key existence:", error.message);
      return false;
    }
  }

  /**
   * Clean up expired entries from memory store
   */
  cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, item] of this.memoryStore.entries()) {
      if (item.expiry && now > item.expiry) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        console.log("[Redis] 👋 Disconnected gracefully");
      }
    } catch (error) {
      console.error("[Redis] Error disconnecting:", error.message);
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      fallbackMode: this.fallbackMode,
      memoryStoreSize: this.memoryStore.size,
    };
  }
}

// Create singleton instance
const redisClient = new RedisClient();

// Cleanup memory store every 5 minutes
setInterval(() => {
  if (redisClient.fallbackMode) {
    redisClient.cleanupMemoryStore();
  }
}, 5 * 60 * 1000);

// Graceful shutdown
process.on("SIGINT", async () => {
  await redisClient.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await redisClient.disconnect();
  process.exit(0);
});

module.exports = redisClient;
