import connectDB from '@/lib/database';
import { RSSSource, KeywordTrack } from '@/models';

const defaultRSSFeeds = [
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'Technology',
    settings: { fetchInterval: 15, maxArticles: 50 }
  },
  {
    name: 'BBC News - Technology',
    url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
    category: 'Technology',
    settings: { fetchInterval: 15, maxArticles: 30 }
  },
  {
    name: 'Reuters - Technology',
    url: 'https://feeds.reuters.com/reuters/technologyNews',
    category: 'Technology',
    settings: { fetchInterval: 20, maxArticles: 40 }
  },
  {
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'Technology',
    settings: { fetchInterval: 30, maxArticles: 25 }
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'Technology',
    settings: { fetchInterval: 15, maxArticles: 40 }
  },
  {
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    category: 'Technology',
    settings: { fetchInterval: 30, maxArticles: 30 }
  },
  {
    name: 'CNN - Business',
    url: 'http://rss.cnn.com/rss/money_latest.rss',
    category: 'Business',
    settings: { fetchInterval: 20, maxArticles: 35 }
  },
  {
    name: 'BBC News - Business',
    url: 'http://feeds.bbci.co.uk/news/business/rss.xml',
    category: 'Business',
    settings: { fetchInterval: 15, maxArticles: 35 }
  }
];

const defaultKeywords = [
  { keyword: 'artificial intelligence', category: 'technology' },
  { keyword: 'machine learning', category: 'technology' },
  { keyword: 'bitcoin', category: 'technology' },
  { keyword: 'cryptocurrency', category: 'technology' },
  { keyword: 'blockchain', category: 'technology' },
  { keyword: 'tesla', category: 'company' },
  { keyword: 'apple', category: 'company' },
  { keyword: 'google', category: 'company' },
  { keyword: 'microsoft', category: 'company' },
  { keyword: 'meta', category: 'company' },
  { keyword: 'climate change', category: 'event' },
  { keyword: 'election', category: 'event' },
  { keyword: 'stock market', category: 'event' }
];

export async function seedDatabase() {
  try {
    await connectDB();
    console.log('Seeding database with default data...');

    // Seed RSS sources
    for (const feedData of defaultRSSFeeds) {
      const existingFeed = await RSSSource.findOne({ url: feedData.url });
      if (!existingFeed) {
        await RSSSource.create({
          ...feedData,
          isActive: true,
          errorCount: 0
        });
        console.log(`Added RSS feed: ${feedData.name}`);
      }
    }

    // Seed keywords
    for (const keywordData of defaultKeywords) {
      const existingKeyword = await KeywordTrack.findOne({ keyword: keywordData.keyword });
      if (!existingKeyword) {
        await KeywordTrack.create({
          ...keywordData,
          isActive: true,
          alertThreshold: {
            sentimentChange: 20,
            volumeSpike: 50
          }
        });
        console.log(`Added keyword: ${keywordData.keyword}`);
      }
    }

    console.log('Database seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}
