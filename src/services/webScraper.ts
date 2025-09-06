import * as cheerio from 'cheerio';
import axios from 'axios';
import { Article } from '@/models';

interface ScrapedArticle {
  title: string;
  content: string;
  url: string;
  publishedAt: Date;
  source: string;
  author?: string;
  imageUrl?: string;
}

interface NewsSource {
  name: string;
  baseUrl: string;
  selectors: {
    articleLinks: string;
    title: string;
    content: string;
    publishedAt?: string;
    author?: string;
    image?: string;
  };
  dateFormat?: string;
  maxArticles?: number;
}

// Configuration for different news websites
const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'BBC News',
    baseUrl: 'https://www.bbc.com/news',
    selectors: {
      articleLinks: 'a[href*="/news/"]',
      title: 'h1, [data-component="headline"]',
      content: '[data-component="text-block"] p, .story-body p',
      publishedAt: 'time[datetime]',
      author: '[data-component="byline"] span',
      image: '[data-component="image"] img'
    },
    maxArticles: 10
  },
  {
    name: 'Reuters',
    baseUrl: 'https://www.reuters.com',
    selectors: {
      articleLinks: 'a[href*="/world/"], a[href*="/business/"], a[href*="/technology/"]',
      title: '[data-testid="Heading"]',
      content: '[data-testid="paragraph"] p, .StandardArticleBody_body p',
      publishedAt: 'time[datetime]',
      author: '[data-testid="Author"]',
      image: '[data-testid="Image"] img'
    },
    maxArticles: 10
  },
  {
    name: 'CNN',
    baseUrl: 'https://www.cnn.com',
    selectors: {
      articleLinks: 'a[href*="/2024/"], a[href*="/2025/"]',
      title: 'h1.headline__text, h1[data-editable="headlineText"]',
      content: '.zn-body__paragraph, .l-container p',
      publishedAt: '.timestamp',
      author: '.byline__name',
      image: '.media__image img'
    },
    maxArticles: 10
  },
  {
    name: 'The Guardian',
    baseUrl: 'https://www.theguardian.com/world',
    selectors: {
      articleLinks: 'a[href*="/2024/"], a[href*="/2025/"]',
      title: '[data-gu-name="headline"] h1, .content__headline',
      content: '.content__article-body p, #maincontent p',
      publishedAt: 'time[datetime]',
      author: '[data-component="byline"] a',
      image: '.content__main-column img'
    },
    maxArticles: 10
  }
];

class WebScraper {
  private readonly userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private readonly timeout = 10000; // 10 seconds
  private readonly requestDelay = 1000; // 1 second between requests

  private async makeRequest(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: this.timeout,
        maxRedirects: 5,
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractText(element: any): string {
    return element.text().trim().replace(/\s+/g, ' ');
  }

  private parseDate(dateString: string, format?: string): Date {
    // Try multiple date formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Fallback to current date if parsing fails
    return new Date();
  }

  private async scrapeArticleLinks(source: NewsSource): Promise<string[]> {
    console.log(`Scraping article links from ${source.name}...`);
    
    try {
      const html = await this.makeRequest(source.baseUrl);
      const $ = cheerio.load(html);
      
      const links: string[] = [];
      $(source.selectors.articleLinks).each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          // Convert relative URLs to absolute
          const absoluteUrl = href.startsWith('http') 
            ? href 
            : new URL(href, source.baseUrl).toString();
          
          // Avoid duplicates and ensure it's a valid article URL
          if (!links.includes(absoluteUrl) && this.isValidArticleUrl(absoluteUrl)) {
            links.push(absoluteUrl);
          }
        }
      });
      
      // Limit the number of articles
      const maxArticles = source.maxArticles || 10;
      return links.slice(0, maxArticles);
    } catch (error) {
      console.error(`Error scraping links from ${source.name}:`, error);
      return [];
    }
  }

  private isValidArticleUrl(url: string): boolean {
    // Filter out non-article URLs
    const excludePatterns = [
      '/live/',
      '/topic/',
      '/video/',
      '/audio/',
      '/gallery/',
      '/sport/',
      '/weather/',
      '#',
      'mailto:',
      'javascript:',
    ];
    
    return !excludePatterns.some(pattern => url.includes(pattern));
  }

  private async scrapeArticle(url: string, source: NewsSource): Promise<ScrapedArticle | null> {
    try {
      console.log(`Scraping article: ${url}`);
      
      const html = await this.makeRequest(url);
      const $ = cheerio.load(html);
      
      // Extract title
      const titleElement = $(source.selectors.title).first();
      const title = this.extractText(titleElement);
      
      if (!title) {
        console.log(`No title found for ${url}`);
        return null;
      }
      
      // Extract content
      const contentElements = $(source.selectors.content);
      let content = '';
      contentElements.each((_, element) => {
        const text = this.extractText($(element));
        if (text && text.length > 20) { // Only include substantial paragraphs
          content += text + '\n\n';
        }
      });
      
      if (content.length < 100) {
        console.log(`Insufficient content for ${url}`);
        return null;
      }
      
      // Extract published date
      let publishedAt = new Date();
      if (source.selectors.publishedAt) {
        const dateElement = $(source.selectors.publishedAt).first();
        const dateString = dateElement.attr('datetime') || this.extractText(dateElement);
        if (dateString) {
          publishedAt = this.parseDate(dateString, source.dateFormat);
        }
      }
      
      // Extract author
      let author: string | undefined;
      if (source.selectors.author) {
        const authorElement = $(source.selectors.author).first();
        author = this.extractText(authorElement) || undefined;
      }
      
      // Extract image
      let imageUrl: string | undefined;
      if (source.selectors.image) {
        const imageElement = $(source.selectors.image).first();
        const src = imageElement.attr('src') || imageElement.attr('data-src');
        if (src) {
          imageUrl = src.startsWith('http') ? src : new URL(src, source.baseUrl).toString();
        }
      }
      
      return {
        title,
        content: content.trim(),
        url,
        publishedAt,
        source: source.name,
        author,
        imageUrl,
      };
      
    } catch (error) {
      console.error(`Error scraping article ${url}:`, error);
      return null;
    }
  }

  async scrapeAllSources(): Promise<ScrapedArticle[]> {
    const allArticles: ScrapedArticle[] = [];
    
    for (const source of NEWS_SOURCES) {
      try {
        console.log(`\n=== Scraping ${source.name} ===`);
        
        // Get article links
        const articleLinks = await this.scrapeArticleLinks(source);
        console.log(`Found ${articleLinks.length} article links`);
        
        // Scrape each article
        for (const link of articleLinks) {
          const article = await this.scrapeArticle(link, source);
          if (article) {
            allArticles.push(article);
            console.log(`✓ Scraped: ${article.title.substring(0, 60)}...`);
          }
          
          // Add delay between requests to be respectful
          await this.sleep(this.requestDelay);
        }
        
        // Add longer delay between sources
        await this.sleep(this.requestDelay * 2);
        
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
        continue;
      }
    }
    
    console.log(`\n✓ Total articles scraped: ${allArticles.length}`);
    return allArticles;
  }

  async scrapeSource(sourceName: string): Promise<ScrapedArticle[]> {
    const source = NEWS_SOURCES.find(s => s.name.toLowerCase() === sourceName.toLowerCase());
    if (!source) {
      throw new Error(`Source '${sourceName}' not found`);
    }
    
    console.log(`\n=== Scraping ${source.name} ===`);
    
    const articleLinks = await this.scrapeArticleLinks(source);
    const articles: ScrapedArticle[] = [];
    
    for (const link of articleLinks) {
      const article = await this.scrapeArticle(link, source);
      if (article) {
        articles.push(article);
      }
      await this.sleep(this.requestDelay);
    }
    
    return articles;
  }

  getAvailableSources(): string[] {
    return NEWS_SOURCES.map(source => source.name);
  }
}

export { WebScraper, type ScrapedArticle, type NewsSource };
export default WebScraper;
