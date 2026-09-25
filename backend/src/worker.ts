import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { redisOptions } from './queue';
import { notifySlack } from './slack';
import { startMockWorker } from './mock-queue';

const prisma = new PrismaClient();
const useLocal = process.env.USE_LOCAL_QUEUE === 'true';

let transporter: any;

async function setupMailer() {
  let user = process.env.ETHEREAL_USER;
  let pass = process.env.ETHEREAL_PASS;
  
  if (!user || !pass) {
    console.log('Generating Ethereal Test Account...');
    const testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;
    console.log(`Generated Ethereal Account: ${user} / ${pass}`);
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: { user, pass }
  });
}

export async function startWorker() {
  await setupMailer();

  if (useLocal) {
    console.log('Using Local SQLite Fallback Queue instead of BullMQ');
    startMockWorker(transporter);
  } else {
    console.log('Starting BullMQ Worker...');
    const worker = new Worker('emailQueue', async (job: Job) => {
      const { id, to, subject, body } = job.data;
      
      console.log(`Processing job ${job.id} for email ID ${id}...`);
      
      try {
        const info = await transporter.sendMail({
          from: '"Production Scheduler" <scheduler@example.com>',
          to,
          subject,
          text: body,
          html: `<b>${body}</b>`,
        });

        console.log(`Message sent: ${info.messageId}`);
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);

        await prisma.emailJob.update({
          where: { id },
          data: { status: 'sent' }
        });

      } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error.message);
        
        if (error.responseCode === 429 || error.message.toLowerCase().includes('rate limit')) {
          await notifySlack(`Rate limit hit while sending email job ${job.id}. Delaying execution...`);
        }
        throw error;
      }
    }, {
      connection: redisOptions,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000
      }
    });

    worker.on('failed', async (job, err) => {
      if (job) {
        console.error(`Job ${job.id} has failed with ${err.message}`);
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
          await prisma.emailJob.update({
            where: { id: job.data.id },
            data: { status: 'failed' }
          });
          await notifySlack(`Email job ${job.id} completely failed after ${job.attemptsMade} attempts.`);
        }
      }
    });
  }
}

if (require.main === module) {
  startWorker().catch(console.error);
}
