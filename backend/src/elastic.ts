import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
dotenv.config();

export const elasticClient = new Client({
  node: process.env.ELASTIC_NODE || 'http://localhost:9200',
  auth: {
    apiKey: process.env.ELASTIC_API_KEY || '',
  }
});

// If ELASTIC_API_KEY is empty and we are local, we might try connecting without auth.
// Let's create an index for emails
export async function setupElastic() {
  try {
    const exists = await elasticClient.indices.exists({ index: 'emails' });
    if (!exists) {
      await elasticClient.indices.create({
        index: 'emails',
        mappings: {
          properties: {
            id: { type: 'integer' },
            to: { type: 'keyword' },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
          }
        }
      });
      console.log('Elasticsearch index "emails" created.');
    }
  } catch (error: any) {
    console.error('Elasticsearch setup failed. (Is Elasticsearch running?):', error.message);
  }
}
