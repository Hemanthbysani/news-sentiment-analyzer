<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# News Sentiment & Metrics Analyzer - Copilot Instructions

This is a comprehensive News Sentiment & Metrics Analyzer built with Next.js, TypeScript, and MongoDB. The project integrates with Google's Gemini API for advanced sentiment analysis.

## Project Architecture

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes with Express-like functionality
- **Database**: MongoDB for storing articles, metrics, and analytics
- **AI**: Google Gemini API for sentiment analysis and NLP processing
- **Theme**: Black, white, and gray color scheme for sleek UI

## Key Features

1. **Multi-source News Scraping**: RSS feeds, NewsAPI, Guardian API
2. **Real-time Sentiment Analysis**: Using Gemini API for advanced NLP
3. **Keyword/Topic Tracking**: Monitor companies, technologies, events
4. **Live Dashboard**: Real-time updates with charts and alerts
5. **Advanced Analytics**: Trend analysis, source distribution, sentiment trends
6. **Alert System**: Email/Slack notifications for sentiment changes
7. **Export Features**: PDF/CSV report generation
8. **Rate Limiting**: Respect robots.txt and implement delays
9. **Duplicate Detection**: Hash-based article deduplication
10. **Multi-language Support**: Translation before analysis

## Coding Guidelines

- Use TypeScript for all components and API routes
- Follow Next.js 15 App Router patterns
- Implement responsive design with Tailwind CSS
- Use MongoDB with Mongoose for data modeling
- Implement proper error handling and logging
- Follow security best practices for API integrations
- Use environment variables for sensitive configuration
- Implement proper caching strategies for API responses
- Use React hooks and modern React patterns
- Implement proper loading states and error boundaries

## UI/UX Guidelines

- Maintain consistent black (#000000), white (#ffffff), and gray (#6b7280, #374151, #111827) color palette
- Use clean, modern design patterns
- Implement responsive layouts for all screen sizes
- Use proper typography hierarchy
- Implement smooth animations and transitions
- Ensure accessibility compliance (WCAG 2.1)
- Use icons and visual indicators effectively
- Implement dark theme as default with light theme option

## API Integration Guidelines

- Use proper rate limiting for all external APIs
- Implement retry logic with exponential backoff
- Cache API responses appropriately
- Handle API errors gracefully
- Use environment variables for API keys
- Implement proper request/response validation
- Log API usage and errors for monitoring
