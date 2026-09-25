import { Queue } from 'bullmq';
import dotenv from 'dotenv';
import { mockEmailQueue } from './mock-queue';
dotenv.config();

const useLocal = process.env.USE_LOCAL_QUEUE === 'true';

export const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  connectTimeout: 10000,
  family: 0,
  tls: process.env.REDIS_HOST?.includes('upstash.io') ? { rejectUnauthorized: false } : undefined
};

let bullQueue: any = null;

if (!useLocal) {
  bullQueue = new Queue('emailQueue', {
    connection: redisOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  });
}

// Export a unified interface
export const emailQueue = useLocal ? mockEmailQueue : bullQueue;
