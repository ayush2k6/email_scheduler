import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function notifySlack(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.includes('YOUR/WEBHOOK/URL')) {
    console.warn('SLACK_WEBHOOK_URL not set properly. Skipping slack notification:', message);
    return;
  }
  
  try {
    await axios.post(webhookUrl, {
      text: message,
    });
    console.log('Slack notification sent.');
  } catch (error: any) {
    console.error('Failed to send slack notification:', error.message);
  }
}
