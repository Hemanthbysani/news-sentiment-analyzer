import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import scraperService from '@/services/scraper';
import WebScraper from '@/services/webScraper';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    let body = {};
    try {
      const requestText = await request.text();
      if (requestText.trim()) {
        body = JSON.parse(requestText);
      }
    } catch (parseError) {
      // If no JSON body provided, use default (scrape all)
      body = {};
    }

    const { source, method } = body as { source?: string; method?: 'rss' | 'web' | 'all' };

    console.log('Starting manual scraping...', { source, method });

    // Web scraping
    if (method === 'web' || (!method && source === 'web')) {
      const webScraper = new WebScraper();
      let scrapedArticles;
      
      if (source && source !== 'web') {
        scrapedArticles = await webScraper.scrapeSource(source);
      } else {
        scrapedArticles = await webScraper.scrapeAllSources();
      }
      
      // Process and save to database using existing scraper service
      await scraperService.processAndSaveArticles(scrapedArticles.map(article => ({
        title: article.title,
        description: article.content.substring(0, 200),
        content: article.content,
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source,
        author: article.author
      })));
      
      return NextResponse.json({ 
        message: 'Web scraping completed',
        articleCount: scrapedArticles.length,
        method: 'web'
      });
    }

    // RSS scraping (existing functionality)
    if (method === 'rss' || source === 'rss') {
      const articles = await scraperService.scrapeRSSFeeds();
      await scraperService.processAndSaveArticles(articles);
      return NextResponse.json({ 
        message: 'RSS scraping completed',
        articleCount: articles.length,
        method: 'rss'
      });
    } else if (source === 'newsapi') {
      const articles = await scraperService.scrapeNewsAPI();
      await scraperService.processAndSaveArticles(articles);
      return NextResponse.json({ 
        message: 'NewsAPI scraping completed',
        articleCount: articles.length 
      });
    } else if (source === 'guardian') {
      const articles = await scraperService.scrapeGuardianAPI();
      await scraperService.processAndSaveArticles(articles);
      return NextResponse.json({ 
        message: 'Guardian API scraping completed',
        articleCount: articles.length 
      });
    } else {
      // Scrape all sources (default)
      await scraperService.scrapeAll();
      return NextResponse.json({ 
        message: 'All sources scraping completed' 
      });
    }

  } catch (error) {
    console.error('Error in manual scraping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      // Return scraping status
      return NextResponse.json({
        message: 'Scraper is ready',
        sources: {
          rss: 'Available',
          newsapi: process.env.NEWSAPI_KEY ? 'Configured' : 'Not configured',
          guardian: process.env.GUARDIAN_API_KEY ? 'Configured' : 'Not configured',
          gemini: process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'
        }
      });
    }

    return NextResponse.json({
      message: 'News scraper API',
      endpoints: {
        'POST /api/scraper': 'Start scraping (body: { source?: "rss" | "newsapi" | "guardian" })',
        'GET /api/scraper?action=status': 'Get scraper status'
      }
    });

  } catch (error) {
    console.error('Error in scraper status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
