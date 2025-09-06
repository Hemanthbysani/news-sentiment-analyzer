import axios from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import connectToDatabase from '@/lib/database';
import { Article, RSSSource } from '@/models';
import GeminiService from './gemini';
import { addSystemLog } from '@/lib/systemLogger';

const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 10000,
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; News-Sentiment-Analyzer/1.0)'
    }
  }
});

export interface ScrapedArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  source: string;
  author?: string;
  publishedAt: Date;
  imageUrl?: string;
  category?: string;
  language?: string;
}

export interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: { id: string; name: string };
    author: string;
    title: string;
    description: string;
    url: string;
    urlToImage: string;
    publishedAt: string;
    content: string;
  }>;
}

export interface GuardianAPIResponse {
  response: {
    status: string;
    total: number;
    results: Array<{
      id: string;
      sectionName: string;
      webTitle: string;
      webUrl: string;
      apiUrl: string;
      fields?: {
        headline: string;
        standfirst: string;
        body: string;
        thumbnail: string;
        byline: string;
      };
      webPublicationDate: string;
    }>;
  };
}

class NewsScraperService {
  private readonly delay: number;
  private readonly maxRequestsPerMinute: number;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor() {
    this.delay = parseInt(process.env.SCRAPER_DELAY_MS || '1000');
    this.maxRequestsPerMinute = parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60');
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.lastResetTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }

    this.requestCount++;
    await new Promise(resolve => setTimeout(resolve, this.delay));
  }

  private generateArticleHash(url: string): string {
    const algorithm = process.env.ARTICLE_HASH_ALGORITHM || 'sha256';
    return createHash(algorithm).update(url).digest('hex');
  }

  private async extractFullContent(url: string): Promise<string> {
    try {
      await this.rateLimit();
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Only accept successful responses
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments').remove();
      
      // Try common content selectors in order of specificity
      const contentSelectors = [
        '[data-module="ArticleBody"] p',
        '.article-body p',
        '.story-body p',
        '.post-content p',
        '.entry-content p',
        '.article-content p',
        '.content p',
        'article p',
        'main p',
        '.text p'
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const elements = $(selector);
        if (elements.length >= 2) { // Need at least 2 paragraphs for good content
          content = elements.map((_, el) => $(el).text().trim()).get()
            .filter(text => text.length > 20) // Filter out short paragraphs
            .join('\n');
          if (content.length > 100) break; // Good enough content found
        }
      }

      // Fallback: extract all paragraph text if specific selectors failed
      if (!content || content.length < 100) {
        const allParagraphs = $('p').map((_, el) => $(el).text().trim()).get()
          .filter(text => text.length > 20)
          .slice(0, 10); // Limit to first 10 meaningful paragraphs
        content = allParagraphs.join('\n');
      }

      return content.trim() || '';
    } catch (error) {
      console.error(`Error extracting content from ${url}:`, error instanceof Error ? error.message : 'Unknown error');
      return ''; // Return empty string instead of throwing
    }
  }

  async scrapeRSSFeeds(): Promise<ScrapedArticle[]> {
    const sources = await RSSSource.find({ isActive: true });
    const articles: ScrapedArticle[] = [];

    for (const source of sources) {
      try {
        console.log(`Scraping RSS feed: ${source.name}`);
        await this.rateLimit();

        const feed = await parser.parseURL(source.url);
        
        for (const item of feed.items.slice(0, source.settings.maxArticles)) {
          if (!item.link || !item.title) continue;

          const urlHash = this.generateArticleHash(item.link);
          
          // Check if article already exists
          const existingArticle = await Article.findOne({ urlHash });
          if (existingArticle) continue;

          // Extract full content
          const fullContent = await this.extractFullContent(item.link);
          
          const article: ScrapedArticle = {
            title: item.title,
            description: item.contentSnippet || item.content || '',
            content: fullContent || item.content || item.contentSnippet || '',
            url: item.link,
            source: source.name,
            author: item.creator || item.author,
            publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
            imageUrl: item.enclosure?.url || undefined,
            category: source.category,
            language: 'en'
          };

          articles.push(article);
        }

        // Update last fetched time
        source.lastFetched = new Date();
        source.lastSuccessful = new Date();
        source.errorCount = 0;
        await source.save();

      } catch (error) {
        console.error(`Error scraping RSS feed ${source.name}:`, error);
        source.lastFetched = new Date();
        source.errorCount += 1;
        source.lastError = error instanceof Error ? error.message : 'Unknown error';
        await source.save();
      }
    }

    return articles;
  }

  async scrapeNewsAPI(query?: string, sources?: string, category?: string): Promise<ScrapedArticle[]> {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      console.warn('NewsAPI key not configured');
      return [];
    }

    try {
      await this.rateLimit();

      // Use top-headlines endpoint for better reliability
      const params = new URLSearchParams({
        apiKey,
        language: 'en',
        pageSize: '50'
      });

      // For general news, use top-headlines; for specific queries, use everything
      let endpoint = 'https://newsapi.org/v2/top-headlines';
      
      if (query) {
        // Use everything endpoint for search queries
        endpoint = 'https://newsapi.org/v2/everything';
        params.append('q', query);
        params.append('sortBy', 'publishedAt');
        params.append('from', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      } else {
        // Use top-headlines with country parameter
        params.append('country', 'us');
      }

      if (sources && !query) {
        params.delete('country'); // Can't use both country and sources
        params.append('sources', sources);
      }
      if (category && !sources && !query) params.append('category', category);

      console.log(`Calling NewsAPI: ${endpoint}?${params.toString()}`);

      const response = await axios.get<NewsAPIResponse>(
        `${endpoint}?${params.toString()}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'News-Sentiment-Analyzer/1.0',
          }
        }
      );

      const articles: ScrapedArticle[] = [];

      for (const item of response.data.articles) {
        if (!item.url || !item.title) continue;

        const urlHash = this.generateArticleHash(item.url);
        
        // Check if article already exists
        const existingArticle = await Article.findOne({ urlHash });
        if (existingArticle) continue;

        // Extract full content if needed and available
        let fullContent = item.content || '';
        
        // Check if content is truncated (NewsAPI truncates at 200-260 characters)
        if (fullContent.includes('[+') || fullContent.includes('...') || fullContent.length < 200) {
          console.log(`Attempting to extract full content for: ${item.title}`);
          const extractedContent = await this.extractFullContent(item.url);
          
          // Use extracted content if successful, otherwise fall back to description + content
          if (extractedContent && extractedContent.length > fullContent.length) {
            fullContent = extractedContent;
          } else if (!fullContent && item.description) {
            // If no content and extraction failed, use description
            fullContent = item.description;
          }
        }

        // Ensure we have some content for analysis
        const contentForAnalysis = fullContent || item.description || item.title;

        const article: ScrapedArticle = {
          title: item.title,
          description: item.description || '',
          content: contentForAnalysis,
          url: item.url,
          source: item.source.name,
          author: item.author || undefined,
          publishedAt: new Date(item.publishedAt),
          imageUrl: item.urlToImage || undefined,
          category: category || undefined,
          language: 'en'
        };

        articles.push(article);
      }

      return articles;
    } catch (error) {
      console.error('Error scraping NewsAPI:', error);
      return [];
    }
  }

  async scrapeGuardianAPI(query?: string, section?: string): Promise<ScrapedArticle[]> {
    const apiKey = process.env.GUARDIAN_API_KEY;
    if (!apiKey || apiKey === 'your_guardian_api_key_here') {
      console.warn('Guardian API key not configured or using placeholder');
      return [];
    }

    try {
      await this.rateLimit();

      const params = new URLSearchParams({
        'api-key': apiKey,
        'show-fields': 'headline,standfirst,body,thumbnail,byline',
        'page-size': '50',
        'order-by': 'newest',
        'from-date': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      if (query) params.append('q', query);
      if (section) params.append('section', section);

      console.log(`Calling Guardian API: https://content.guardianapis.com/search?${params.toString()}`);

      const response = await axios.get<GuardianAPIResponse>(
        `https://content.guardianapis.com/search?${params.toString()}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'News-Sentiment-Analyzer/1.0',
          }
        }
      );

      const articles: ScrapedArticle[] = [];

      for (const item of response.data.response.results) {
        if (!item.webUrl || !item.webTitle) continue;

        const urlHash = this.generateArticleHash(item.webUrl);
        
        // Check if article already exists
        const existingArticle = await Article.findOne({ urlHash });
        if (existingArticle) continue;

        const article: ScrapedArticle = {
          title: item.fields?.headline || item.webTitle,
          description: item.fields?.standfirst || '',
          content: item.fields?.body || '',
          url: item.webUrl,
          source: 'The Guardian',
          author: item.fields?.byline || undefined,
          publishedAt: new Date(item.webPublicationDate),
          imageUrl: item.fields?.thumbnail || undefined,
          category: item.sectionName,
          language: 'en'
        };

        articles.push(article);
      }

      return articles;
    } catch (error) {
      console.error('Error scraping Guardian API:', error);
      return [];
    }
  }

  async processAndSaveArticles(scrapedArticles: ScrapedArticle[]): Promise<void> {
    // Limit processing to prevent hitting API quotas
    const maxArticlesToProcess = Math.min(scrapedArticles.length, 10);
    const articlesToProcess = scrapedArticles.slice(0, maxArticlesToProcess);
    
    console.log(`Processing ${articlesToProcess.length} out of ${scrapedArticles.length} scraped articles`);

    for (const scrapedArticle of articlesToProcess) {
      try {
        const urlHash = this.generateArticleHash(scrapedArticle.url);
        
        // Check for duplicates again (in case of concurrent scraping)
        const existingArticle = await Article.findOne({ urlHash });
        if (existingArticle) continue;

        console.log(`Processing article: ${scrapedArticle.title}`);

        // Ensure we have content for analysis
        let analysisText = scrapedArticle.content;
        if (!analysisText || analysisText.length < 50) {
          analysisText = `${scrapedArticle.title}. ${scrapedArticle.description}`;
        }

        // Translate if not in English
        if (scrapedArticle.language && scrapedArticle.language !== 'en') {
          try {
            analysisText = await GeminiService.translateText(analysisText, 'en');
          } catch (error) {
            console.error('Error translating text:', error);
            // Continue with original text
          }
        }

        // Analyze with Gemini - process sequentially to respect rate limits
        let sentiment, entities, keywordData, readability;
        
        try {
          sentiment = await GeminiService.analyzeSentiment(analysisText);
        } catch (error) {
          console.error('Error analyzing sentiment:', error);
          sentiment = { score: 0, confidence: 0.1, label: 'neutral' as const };
        }

        try {
          entities = await GeminiService.extractEntities(analysisText);
        } catch (error) {
          console.error('Error extracting entities:', error);
          entities = { person: [], organization: [], location: [], technology: [], other: [] };
        }

        try {
          keywordData = await GeminiService.extractKeywords(analysisText);
        } catch (error) {
          console.error('Error extracting keywords:', error);
          keywordData = { keywords: [], topics: [] };
        }

        try {
          readability = await GeminiService.calculateReadability(analysisText);
        } catch (error) {
          console.error('Error calculating readability:', error);
          readability = 5; // Default readability score
        }

        // Create and save article
        const article = new Article({
          title: scrapedArticle.title,
          description: scrapedArticle.description,
          content: scrapedArticle.content,
          url: scrapedArticle.url,
          urlHash,
          source: scrapedArticle.source,
          author: scrapedArticle.author,
          publishedAt: scrapedArticle.publishedAt,
          imageUrl: scrapedArticle.imageUrl,
          category: scrapedArticle.category,
          language: scrapedArticle.language || 'en',
          sentiment,
          keywords: keywordData.keywords,
          entities,
          metrics: {
            readability,
            wordCount: analysisText.split(/\s+/).length,
            socialShares: 0
          }
        });

        await article.save();
        console.log(`Saved article: ${article.title}`);

      } catch (error) {
        console.error(`Error processing article ${scrapedArticle.title}:`, error);
      }
    }
  }

  async scrapeAll(): Promise<void> {
    console.log('Starting comprehensive news scraping...');
    await addSystemLog('info', 'Starting comprehensive news scraping');

    try {
      const allArticles: ScrapedArticle[] = [];

      // Scrape RSS feeds (most reliable)
      console.log('Scraping RSS feeds...');
      try {
        const rssArticles = await this.scrapeRSSFeeds();
        allArticles.push(...rssArticles);
        console.log(`Scraped ${rssArticles.length} articles from RSS feeds`);
        await addSystemLog('success', `Scraped ${rssArticles.length} articles from RSS feeds`);
      } catch (error) {
        console.error('Error scraping RSS feeds:', error);
        await addSystemLog('error', 'Error scraping RSS feeds', { error: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Scrape NewsAPI (if configured)
      console.log('Scraping NewsAPI...');
      try {
        const newsApiArticles = await this.scrapeNewsAPI();
        allArticles.push(...newsApiArticles);
        console.log(`Scraped ${newsApiArticles.length} articles from NewsAPI`);
        await addSystemLog('success', `Scraped ${newsApiArticles.length} articles from NewsAPI`);
      } catch (error) {
        console.error('Error scraping NewsAPI:', error);
        await addSystemLog('error', 'Error scraping NewsAPI', { error: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Scrape Guardian API (if configured)
      console.log('Scraping Guardian API...');
      try {
        const guardianArticles = await this.scrapeGuardianAPI();
        allArticles.push(...guardianArticles);
        console.log(`Scraped ${guardianArticles.length} articles from Guardian API`);
        await addSystemLog('success', `Scraped ${guardianArticles.length} articles from Guardian API`);
      } catch (error) {
        console.error('Error scraping Guardian API:', error);
        await addSystemLog('error', 'Error scraping Guardian API', { error: error instanceof Error ? error.message : 'Unknown error' });
      }

      console.log(`Scraped ${allArticles.length} articles total`);
      await addSystemLog('info', `Scraped ${allArticles.length} articles total`);

      if (allArticles.length > 0) {
        // Process and save articles
        await this.processAndSaveArticles(allArticles);
        console.log('News scraping completed successfully');
      } else {
        console.log('No articles scraped - check API configurations');
      }
    } catch (error) {
      console.error('Error in comprehensive scraping:', error);
    }
  }
}

export default new NewsScraperService();
