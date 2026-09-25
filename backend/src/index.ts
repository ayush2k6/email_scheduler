import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { emailQueue } from './queue';
import { elasticClient, setupElastic } from './elastic';
import { startWorker } from './worker';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Root endpoint to verify server is running
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running successfully!', status: 'ok' });
});

// Schedule an email
app.post('/api/emails', async (req, res) => {
  const { to, subject, body, scheduledAt } = req.body;

  if (!to || !subject || !body || !scheduledAt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const scheduledDate = new Date(scheduledAt);
    const delay = scheduledDate.getTime() - Date.now();
    
    // Save to database
    const emailJob = await prisma.emailJob.create({
      data: {
        to,
        subject,
        body,
        scheduledAt: scheduledDate,
        status: 'pending',
      }
    });

    // Add to BullMQ
    const job = await emailQueue.add('sendEmail', emailJob, {
      delay: delay > 0 ? delay : 0,
      jobId: `job-${emailJob.id}`, // Ensures no duplicate execution and avoids integer ID error
    });

    // Update with Job ID
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { jobId: job.id }
    });

    // Save to Elasticsearch for searching
    try {
      await elasticClient.index({
        index: 'emails',
        id: emailJob.id.toString(),
        document: {
          id: emailJob.id,
          to,
          subject,
          body,
          status: 'pending',
          scheduledAt: scheduledDate,
        }
      });
    } catch (esError) {
      console.warn('Failed to index to Elasticsearch, but job is queued:', esError);
    }

    res.status(201).json({ message: 'Email scheduled successfully', job: emailJob });
  } catch (error: any) {
    console.error('Error scheduling email:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Search emails
app.get('/api/emails/search', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    // If no query, just return latest from DB
    const emails = await prisma.emailJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return res.json(emails);
  }

  try {
    const result = await elasticClient.search({
      index: 'emails',
      query: {
        multi_match: {
          query: q.toString(),
          fields: ['to', 'subject', 'body']
        }
      }
    });

    const hits = result.hits.hits.map((hit: any) => hit._source);
    res.json(hits);
  } catch (error: any) {
    console.error('Elasticsearch search error:', error);
    // Fallback to database search if ES fails
    const emails = await prisma.emailJob.findMany({
      where: {
        OR: [
          { subject: { contains: q.toString() } },
          { body: { contains: q.toString() } },
          { to: { contains: q.toString() } },
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(emails);
  }
});

// Get all emails
app.get('/api/emails', async (req, res) => {
  const emails = await prisma.emailJob.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(emails);
});

// Clear all emails (history)
app.delete('/api/emails', async (req, res) => {
  try {
    // Delete from Database
    await prisma.emailJob.deleteMany({});
    
    // Clear from Elasticsearch
    try {
      await elasticClient.deleteByQuery({
        index: 'emails',
        query: { match_all: {} }
      });
    } catch (esError) {
      console.warn('Failed to clear Elasticsearch, might be already empty:', esError);
    }

    res.json({ message: 'History cleared successfully' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await setupElastic();
  await startWorker();
  
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

bootstrap().catch(console.error);
