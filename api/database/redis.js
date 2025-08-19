const Redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

async function initRedis() {
  try {
    // Create Redis client
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    // Handle Redis events
    redisClient.on('connect', () => {
      logger.info('✅ Redis connected');
      isConnected = true;
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready');
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis error:', err);
      isConnected = false;
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
      isConnected = false;
    });

    // Connect to Redis
    await redisClient.connect();
    
    // Test connection
    await redisClient.ping();
    logger.info('✅ Redis connection test successful');
    
  } catch (error) {
    logger.error('❌ Redis initialization failed:', error);
    // Don't throw error for Redis - it's optional for some features
    isConnected = false;
  }
}

async function getRedisClient() {
  if (!redisClient || !isConnected) {
    throw new Error('Redis not connected');
  }
  return redisClient;
}

async function closeRedis() {
  if (redisClient && isConnected) {
    await redisClient.quit();
    isConnected = false;
    logger.info('Redis connection closed');
  }
}

// Redis utility functions
async function setCache(key, value, ttl = 3600) {
  try {
    const client = await getRedisClient();
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    await client.setEx(key, ttl, serializedValue);
    return true;
  } catch (error) {
    logger.error('Redis setCache error:', error);
    return false;
  }
}

async function getCache(key) {
  try {
    const client = await getRedisClient();
    const value = await client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logger.error('Redis getCache error:', error);
    return null;
  }
}

async function deleteCache(key) {
  try {
    const client = await getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Redis deleteCache error:', error);
    return false;
  }
}

async function setSession(sessionId, data, ttl = 1800) {
  return setCache(`session:${sessionId}`, data, ttl);
}

async function getSession(sessionId) {
  return getCache(`session:${sessionId}`);
}

async function deleteSession(sessionId) {
  return deleteCache(`session:${sessionId}`);
}

async function incrementCounter(key, ttl = 3600) {
  try {
    const client = await getRedisClient();
    const result = await client.incr(key);
    await client.expire(key, ttl);
    return result;
  } catch (error) {
    logger.error('Redis incrementCounter error:', error);
    return 0;
  }
}

async function getCounter(key) {
  try {
    const client = await getRedisClient();
    const value = await client.get(key);
    return value ? parseInt(value) : 0;
  } catch (error) {
    logger.error('Redis getCounter error:', error);
    return 0;
  }
}

async function setRealTimeData(websiteId, data) {
  return setCache(`realtime:${websiteId}`, data, 300); // 5 minutes TTL
}

async function getRealTimeData(websiteId) {
  return getCache(`realtime:${websiteId}`);
}

async function publishEvent(channel, message) {
  try {
    const client = await getRedisClient();
    await client.publish(channel, JSON.stringify(message));
    return true;
  } catch (error) {
    logger.error('Redis publishEvent error:', error);
    return false;
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis,
  setCache,
  getCache,
  deleteCache,
  setSession,
  getSession,
  deleteSession,
  incrementCounter,
  getCounter,
  setRealTimeData,
  getRealTimeData,
  publishEvent,
  isConnected: () => isConnected
};
