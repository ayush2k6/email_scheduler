# ✉️ Email Scheduler

A full-stack, high-performance transactional email delivery system featuring a beautiful, modern glassmorphism UI. Built to effortlessly queue, schedule, and search through large volumes of emails using a robust background worker architecture.

![UI Preview](frontend/public/logo.png)

## ✨ Features

- **Sleek Modern UI:** Designed with a premium dark mode, glassmorphism (`backdrop-filter`), and dynamic gradients.
- **Robust Email Queueing:** Powered by BullMQ and Redis (with a local SQLite fallback mode) for reliable background task execution.
- **Advanced Global Search:** Integrated Elasticsearch for lightning-fast querying of your email history.
- **Hosted Database:** Utilizes Prisma ORM connected to a highly available Supabase PostgreSQL database.
- **Schedule & Forget:** Schedule emails for future delivery with real-time status tracking (Pending, Sent, Failed).
- **History Management:** Easily clear your database and search indices with a single click.

## 🛠️ Tech Stack

**Frontend:**
- [React 19](https://react.dev/) & [Vite](https://vitejs.dev/)
- Vanilla CSS (Premium Glassmorphism Aesthetic)
- [Lucide React](https://lucide.dev/) for Icons
- [Date-fns](https://date-fns.org/) for date formatting

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/) (Supabase PostgreSQL)
- [BullMQ](https://docs.bullmq.io/) (Redis Job Queue)
- [Elasticsearch](https://www.elastic.co/)
- [Nodemailer](https://nodemailer.com/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- (Optional but Recommended) Upstash Redis URL
- (Optional but Recommended) Elastic Cloud URL
- Supabase Project URL

### 1. Clone the repository
```bash
git clone https://github.com/your-username/email-scheduler.git
cd email-scheduler
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Configure your environment variables:
Rename `.env.example` to `.env` (or create a new `.env` file) and fill in your details:
```env
# Supabase PostgreSQL Database
DATABASE_URL="postgresql://user:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Server Port
PORT=3000

# Queue Setup (Set to "false" for production to use actual Redis)
USE_LOCAL_QUEUE="true"
REDIS_HOST="your-redis-host"
REDIS_PORT=6379
REDIS_PASSWORD="your-redis-password"

# Elasticsearch (Optional but required for Search)
ELASTIC_NODE="your-elastic-url"
ELASTIC_API_KEY="your-api-key"

# Email Configuration (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE="true"
ETHEREAL_USER="your-email@gmail.com"
ETHEREAL_PASS="your-app-password"
```

Push the database schema to Supabase:
```bash
npx prisma generate
npx prisma db push
```

Start the backend server:
```bash
npm run dev
# OR: npx ts-node src/index.ts
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```
Start the development server:
```bash
npm run dev
```
Visit `http://localhost:5173` in your browser.

---

## 🌍 Deployment Guide

This application is decoupled and designed to be deployed across specialized hosting providers.

1. **Database:** Hosted on [Supabase](https://supabase.com/).
2. **Backend (Node.js API & Workers):** Since this project runs a persistent background worker for BullMQ, deploy the `backend` directory to **Render** or **Railway**. *Note: Serverless platforms like Vercel are not suitable for the backend worker.*
3. **Frontend (React UI):** Deploy the `frontend` directory to **Vercel**, **Netlify**, or **Cloudflare Pages**. Set the `VITE_API_URL` environment variable to your deployed backend URL.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/email-scheduler/issues).

## 📝 License
This project is [MIT](LICENSE) licensed.
