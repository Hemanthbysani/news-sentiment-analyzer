# News Sentiment & Metrics Analyzer

A comprehensive news sentiment analysis and metrics tracking system built with Next.js, TypeScript, MongoDB, and Google's Gemini AI. This application scrapes news from multiple sources, analyzes sentiment using advanced AI, and provides real-time analytics through a sleek dashboard.

![Dashboard Preview](https://img.shields.io/badge/Dashboard-Live-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Ready-green)
![AI Powered](https://img.shields.io/badge/AI-Gemini%20Powered-orange)

## 🚀 Features

### Core Features
- **Multi-source News Scraping**: RSS feeds, NewsAPI, Guardian API
- **AI-Powered Sentiment Analysis**: Uses Google Gemini for advanced NLP
- **Real-time Dashboard**: Live updates with charts and metrics
- **Keyword/Topic Tracking**: Monitor companies, technologies, events
- **Trend Analytics**: Volume trends, sentiment changes, source distribution
- **Alert System**: Email/Slack notifications for significant changes
- **Automated Scheduling**: Background tasks for continuous data collection
- **System Status Monitoring**: Real-time health checks and status indicators

### Advanced Features
- **Database Management**: Complete CRUD operations for all collections with UI
- **System Monitoring**: Real-time health monitoring with detailed logs
- **Rate Limiting**: Respects robots.txt and implements delays
- **Duplicate Detection**: Hash-based article deduplication
- **Multi-language Support**: Translation before analysis
- **Export Reports**: PDF/CSV generation capabilities
- **Custom Alerts**: Configurable thresholds for sentiment and volume changes
- **Background Scheduler**: Automated scraping, alert checking, and analytics
- **System Health Dashboard**: Monitor database, APIs, and background services
- **Docker Support**: Complete containerization for easy deployment
- **Sleek UI**: Black, white, and gray theme with responsive design

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose
- **AI/ML**: Google Gemini API for sentiment analysis
- **Scraping**: Custom scrapers for RSS, NewsAPI, Guardian API
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- Google Gemini API key
- NewsAPI key (optional)
- Guardian API key (optional)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd news-sentiment-analyzer
npm install
```

### 2. Environment Setup

Copy the environment template:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/news-sentiment-analyzer

# Google Gemini API (Required)
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# News APIs (Optional but recommended)
# Get your API key from: https://newsapi.org/
NEWSAPI_KEY=your_newsapi_key_here
# Get your API key from: https://open-platform.theguardian.com/access/
GUARDIAN_API_KEY=your_guardian_api_key_here

# Email Configuration (Optional - for email alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Slack Webhook (Optional - for Slack alerts)
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_super_secure_jwt_secret_key_here
```

### 3. Database Setup

Make sure MongoDB is running, then seed the database:

```bash
# Start the development server
npm run dev

# In another terminal, seed the database
curl -X POST http://localhost:3000/api/seed
```

### 4. Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Usage

### Dashboard Overview

The main dashboard provides:
- **Metrics Cards**: Total articles, average sentiment, distribution, alerts
- **Top Keywords**: Most mentioned terms with sentiment scores
- **Top Sources**: News sources ranked by article count
- **Article Feed**: Real-time list of analyzed articles
- **Search & Filters**: Filter by source, sentiment, keywords

### Scraping News

1. **Automatic Scraping**: Click "Scrape News" to fetch from all sources
2. **Manual Configuration**: Add RSS feeds via API or database
3. **Scheduled Scraping**: Set up cron jobs for regular updates

### Keyword Tracking

1. Add keywords to track via the API:
```bash
curl -X POST http://localhost:3000/api/keywords \
  -H "Content-Type: application/json" \
  -d '{"keyword": "artificial intelligence", "category": "technology"}'
```

2. Set alert thresholds for volume spikes and sentiment changes
3. Monitor trends and receive notifications

### Analytics & Trends

- **Sentiment Trends**: Track sentiment changes over time
- **Volume Analysis**: Monitor article volume patterns
- **Source Distribution**: Analyze which sources publish most
- **Keyword Performance**: Track keyword mention frequency

## 🔧 API Endpoints

### Articles
- `GET /api/articles` - List articles with filtering
- `POST /api/articles` - Add new article manually

### Analytics
- `GET /api/analytics` - Get dashboard metrics
- `GET /api/analytics?timeframe=day|week|month` - Filter by timeframe

### Keywords
- `GET /api/keywords` - List tracked keywords
- `POST /api/keywords` - Add new keyword to track
- `DELETE /api/keywords?id=<id>` - Remove keyword

### Scraper
- `POST /api/scraper` - Start manual scraping
- `POST /api/scraper` with `{"source": "rss|newsapi|guardian"}` - Scrape specific source
- `GET /api/scraper?action=status` - Get scraper status

### RSS Sources
- `GET /api/rss-sources` - List RSS feeds
- `POST /api/rss-sources` - Add new RSS feed
- `PUT /api/rss-sources` - Update RSS feed
- `DELETE /api/rss-sources?id=<id>` - Remove RSS feed

### Alerts
- `GET /api/alerts` - List alerts
- `PATCH /api/alerts` - Mark alerts as read
- `POST /api/alerts` - Create custom alert

### Scheduler
- `GET /api/scheduler` - Get scheduler status
- `POST /api/scheduler` - Start/stop scheduler
- `POST /api/scheduler` with `{"action": "start"}` - Start background tasks
- `POST /api/scheduler` with `{"action": "stop"}` - Stop background tasks

### Seed Data
- `POST /api/seed` - Populate database with sample data

### Database
- `GET /api/database?action=stats` - Get database statistics
- `GET /api/database?collection=articles&page=1&limit=20` - Browse collection data
- `DELETE /api/database?collection=articles&id=<item_id>` - Delete specific item
- `DELETE /api/database?collection=articles` - Clear collection
- `DELETE /api/database?action=clear-all` - Clear all data

### System Logs
- `GET /api/system-logs?action=status` - Get system status
- `GET /api/system-logs?level=error&limit=100` - Get system logs
- `POST /api/system-logs` - Add custom log

## 🤖 Background Scheduler

The application includes an automated scheduler for continuous operation:

### Scheduled Tasks
- **News Scraping**: Every 15 minutes (configurable via `SCRAPER_CRON_SCHEDULE`)
- **Alert Checking**: Every hour for keyword monitoring
- **Analytics Caching**: Daily at midnight (configurable via `ANALYTICS_CRON_SCHEDULE`)

### Managing the Scheduler
```bash
# Start scheduler via API
npm run scheduler:start

# Stop scheduler via API
npm run scheduler:stop

# Check scheduler status
npm run scheduler:status
```

## 🐋 Docker Deployment

### Quick Docker Setup
```bash
# Build and run with Docker Compose (includes MongoDB)
docker-compose up --build

# For development with hot reload
docker-compose -f docker-compose.dev.yml up --build
```

### Manual Docker Commands
```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Stop all containers
npm run docker:down
```

### Environment Variables for Docker
Make sure your `.env.local` includes:
```env
MONGODB_URI=mongodb://mongodb:27017/news-sentiment-analyzer
```

## 📊 Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Data Operations
```bash
npm run seed         # Populate database with sample data
npm run scrape       # Start manual news scraping
```

### Scheduler Management
```bash
npm run scheduler:start   # Start background scheduler
npm run scheduler:stop    # Stop background scheduler
npm run scheduler:status  # Check scheduler status
```

### Docker Operations
```bash
npm run docker:build     # Build Docker image
npm run docker:run       # Run Docker container
npm run docker:dev       # Start development environment
npm run docker:prod      # Start production environment
npm run docker:down      # Stop all containers
```

### System Setup
```bash
npm run setup        # Run setup script (installs MongoDB, etc.)
```

## 🎨 UI Features

### Design System
- **Color Scheme**: Black (#000000), White (#ffffff), Gray palette (#6b7280, #374151, #111827)
- **Typography**: Clean, hierarchical text layout
- **Icons**: Lucide React icons throughout
- **Responsive**: Mobile-first design approach
- **Accessibility**: WCAG 2.1 compliant

### Interactive Elements
- **Real-time Updates**: Auto-refresh capabilities
- **Search & Filter**: Advanced filtering options
- **Hover Effects**: Smooth transitions and interactions
- **Loading States**: Skeleton screens and spinners
- **Error Handling**: Graceful error boundaries

## 🔒 Security Features

- **API Rate Limiting**: Prevents abuse and respects source limits
- **Input Validation**: Sanitizes all user inputs
- **Environment Variables**: Secure configuration management
- **Error Handling**: Detailed logging without exposing internals

## 📈 Performance Optimizations

- **Database Indexing**: Optimized MongoDB queries
- **Caching**: Intelligent caching of API responses
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Next.js image optimization
- **Bundle Splitting**: Optimized JavaScript bundles

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on git push

### Docker

```dockerfile
# Dockerfile included in project
docker build -t news-sentiment-analyzer .
docker run -p 3000:3000 news-sentiment-analyzer
```

### Manual Deployment

```bash
npm run build
npm start
```

## 🧪 Development

### Project Structure

```
src/
├── app/                # Next.js app directory
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Dashboard page
├── lib/               # Utilities
│   ├── database.ts    # MongoDB connection
│   └── seed.ts        # Database seeding
├── models/            # MongoDB models
│   └── index.ts       # All models
├── services/          # Business logic
│   ├── analytics.ts   # Analytics service
│   ├── gemini.ts      # Gemini AI service
│   └── scraper.ts     # News scraping service
└── components/        # React components (future)
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build production version
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

### Adding New Features

1. **New Data Source**: Add to `scraper.ts`
2. **New Analytics**: Extend `analytics.ts`
3. **New API Endpoint**: Add to `app/api/`
4. **New UI Component**: Add to `components/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the GitHub issues
- Review the API documentation
- Check environment variable configuration

## 🚀 Future Enhancements

- **Machine Learning Models**: Custom sentiment models
- **Advanced Charts**: More visualization options
- **Mobile App**: React Native companion app
- **Webhook Integration**: Real-time notifications
- **Multi-tenant Support**: Organization-level separation
- **Advanced Analytics**: Predictive modeling
- **Content Categorization**: AI-powered article categorization
- **Social Media Integration**: Twitter, Reddit analysis

---

Built with ❤️ using Next.js, TypeScript, and Google Gemini AI
