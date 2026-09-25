import { PrismaClient } from '@prisma/client';
import { notifySlack } from './slack';

const prisma = new PrismaClient();
let mockWorkerInterval: NodeJS.Timeout | null = null;
let transporterRef: any = null;

// Mock Queue that mimics BullMQ add method
export const mockEmailQueue = {
  add: async (name: string, data: any, opts: any) => {
    console.log(`[MockQueue] Job ${name} scheduled with delay ${opts.delay}ms`);
    // The DB already saved the scheduledAt time, so our mock worker will just poll for it.
    return { id: `mock-job-${Date.now()}` };
  }
};

// Mock Worker that polls SQLite every 5 seconds to process emails
export function startMockWorker(transporter: any) {
  transporterRef = transporter;
  console.log('[MockWorker] Started polling SQLite for scheduled jobs...');
  
  mockWorkerInterval = setInterval(async () => {
    try {
      const now = new Date();
      
      // Find pending jobs that are due
      const jobs = await prisma.emailJob.findMany({
        where: {
          status: 'pending',
          scheduledAt: { lte: now }
        },
        take: 5 // Concurrency of 5
      });

      for (const job of jobs) {
        console.log(`[MockWorker] Processing job ${job.id} for ${job.to}...`);
        
        try {
          const info = await transporterRef.sendMail({
            from: '"Production Scheduler" <scheduler@example.com>',
            to: job.to,
            subject: job.subject,
            text: job.body,
            html: `<b>${job.body}</b>`,
          });

          console.log(`[MockWorker] Message sent: ${info.messageId}`);
          
          if (info.messageId && transporterRef.options.host === 'smtp.ethereal.email') {
            const nodemailer = require('nodemailer');
            console.log(`[MockWorker] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
          }
          
          await prisma.emailJob.update({
            where: { id: job.id },
            data: { status: 'sent' }
          });
        } catch (error: any) {
          console.error(`[MockWorker] Job ${job.id} failed:`, error.message);
          
          if (error.responseCode === 429 || error.message.toLowerCase().includes('rate limit')) {
            await notifySlack(`Rate limit hit while sending email job ${job.id}.`);
          }

          // Mark as failed
          await prisma.emailJob.update({
            where: { id: job.id },
            data: { status: 'failed' }
          });
        }
      }
    } catch (err) {
      console.error('[MockWorker] Error polling jobs:', err);
    }
  }, 5000);
}
