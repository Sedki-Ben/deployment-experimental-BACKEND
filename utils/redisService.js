const redis = require('redis');
const { promisify } = require('util');

class RedisService {
    constructor() {
        this.client = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD
        });

        this.client.on('error', (err) => console.error('Redis Client Error:', err));
        this.client.on('connect', () => console.log('Connected to Redis'));

        // Promisify Redis commands
        this.get = promisify(this.client.get).bind(this.client);
        this.set = promisify(this.client.set).bind(this.client);
        this.del = promisify(this.client.del).bind(this.client);
        this.exists = promisify(this.client.exists).bind(this.client);
    }

    async getCache(key) {
        try {
            const data = await this.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    async setCache(key, value, expirySeconds = 3600) {
        try {
            const stringValue = JSON.stringify(value);
            await this.set(key, stringValue, 'EX', expirySeconds);
            return true;
        } catch (error) {
            console.error('Redis set error:', error);
            return false;
        }
    }

    async deleteCache(key) {
        try {
            await this.del(key);
            return true;
        } catch (error) {
            console.error('Redis delete error:', error);
            return false;
        }
    }

    async clearCache(pattern) {
        try {
            const keys = await promisify(this.client.keys).bind(this.client)(pattern);
            if (keys.length > 0) {
                await this.del(keys);
            }
            return true;
        } catch (error) {
            console.error('Redis clear cache error:', error);
            return false;
        }
    }

    generateKey(...args) {
        return args.join(':');
    }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService; 
 