import { Article, Analytics, Alert, KeywordTrack } from '@/models';
import { startOfHour, startOfDay, startOfWeek, startOfMonth, subDays, subHours } from 'date-fns';

export interface TrendData {
  date: Date;
  value: number;
  sentiment?: number;
  count?: number;
}

export interface SentimentTrend {
  timeframe: 'hour' | 'day' | 'week' | 'month';
  data: TrendData[];
}

export interface KeywordMetrics {
  keyword: string;
  count: number;
  sentiment: number;
  trend: TrendData[];
  entities: {
    articles: number;
    averageSentiment: number;
    sources: string[];
  };
}

export interface SourceMetrics {
  source: string;
  count: number;
  sentiment: number;
  trend: TrendData[];
  categories: Array<{ category: string; count: number }>;
}

export interface DashboardMetrics {
  overview: {
    totalArticles: number;
    averageSentiment: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
    topKeywords: Array<{ keyword: string; count: number; sentiment: number }>;
    topSources: Array<{ source: string; count: number; sentiment: number }>;
    recentAlerts: number;
  };
  trends: {
    sentiment: SentimentTrend;
    volume: TrendData[];
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

class AnalyticsService {
  async generateDashboardMetrics(
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 100
  ): Promise<DashboardMetrics> {
    const now = new Date();
    let startDate: Date;
    let groupByField: string;

    switch (timeframe) {
      case 'hour':
        startDate = subHours(now, 24);
        groupByField = '$hour';
        break;
      case 'day':
        startDate = subDays(now, 30);
        groupByField = '$dayOfYear';
        break;
      case 'week':
        startDate = subDays(now, 90);
        groupByField = '$week';
        break;
      case 'month':
        startDate = subDays(now, 365);
        groupByField = '$month';
        break;
      default:
        startDate = subDays(now, 30);
        groupByField = '$dayOfYear';
    }

    // Get articles in the time range
    const articles = await Article.find({
      publishedAt: { $gte: startDate, $lte: now }
    }).sort({ publishedAt: -1 }).limit(limit);

    // Calculate overview metrics
    const totalArticles = articles.length;
    const averageSentiment = articles.reduce((sum, article) => sum + article.sentiment.score, 0) / totalArticles || 0;
    
    const sentimentDistribution = articles.reduce(
      (acc, article) => {
        acc[article.sentiment.label]++;
        return acc;
      },
      { positive: 0, negative: 0, neutral: 0 }
    );

    // Get top keywords
    const keywordCounts: { [key: string]: { count: number; sentiment: number } } = {};
    articles.forEach(article => {
      article.keywords.forEach((keyword: string) => {
        if (!keywordCounts[keyword]) {
          keywordCounts[keyword] = { count: 0, sentiment: 0 };
        }
        keywordCounts[keyword].count++;
        keywordCounts[keyword].sentiment += article.sentiment.score;
      });
    });

    const topKeywords = Object.entries(keywordCounts)
      .map(([keyword, data]) => ({
        keyword,
        count: data.count,
        sentiment: data.sentiment / data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get top sources
    const sourceCounts: { [key: string]: { count: number; sentiment: number } } = {};
    articles.forEach(article => {
      if (!sourceCounts[article.source]) {
        sourceCounts[article.source] = { count: 0, sentiment: 0 };
      }
      sourceCounts[article.source].count++;
      sourceCounts[article.source].sentiment += article.sentiment.score;
    });

    const topSources = Object.entries(sourceCounts)
      .map(([source, data]) => ({
        source,
        count: data.count,
        sentiment: data.sentiment / data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate sentiment trends
    const sentimentTrend = await this.generateSentimentTrend(timeframe, startDate, now);
    
    // Generate volume trends
    const volumeTrend = await this.generateVolumeTrend(timeframe, startDate, now);

    // Get recent alerts count
    const recentAlerts = await Alert.countDocuments({
      createdAt: { $gte: subHours(now, 24) },
      isRead: false
    });

    return {
      overview: {
        totalArticles,
        averageSentiment,
        sentimentDistribution,
        topKeywords,
        topSources,
        recentAlerts
      },
      trends: {
        sentiment: sentimentTrend,
        volume: volumeTrend
      },
      timeRange: {
        start: startDate,
        end: now
      }
    };
  }

  async generateSentimentTrend(
    timeframe: 'hour' | 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ): Promise<SentimentTrend> {
    let groupStage: any;
    let dateFormat: any;

    switch (timeframe) {
      case 'hour':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' },
          day: { $dayOfMonth: '$publishedAt' },
          hour: { $hour: '$publishedAt' }
        };
        break;
      case 'day':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' },
          day: { $dayOfMonth: '$publishedAt' }
        };
        break;
      case 'week':
        groupStage = {
          year: { $year: '$publishedAt' },
          week: { $week: '$publishedAt' }
        };
        break;
      case 'month':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' }
        };
        break;
    }

    const pipeline = [
      {
        $match: {
          publishedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupStage,
          averageSentiment: { $avg: '$sentiment.score' },
        count: { $sum: 1 },
        date: { $first: '$publishedAt' }
      }
    },
    {
      $sort: { '_id': 1 as const }
    }
  ];

  const results = await Article.aggregate(pipeline);    const data: TrendData[] = results.map(result => ({
      date: this.reconstructDate(result._id, timeframe),
      value: result.averageSentiment,
      sentiment: result.averageSentiment,
      count: result.count
    }));

    return {
      timeframe,
      data
    };
  }

  async generateVolumeTrend(
    timeframe: 'hour' | 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ): Promise<TrendData[]> {
    let groupStage: any;

    switch (timeframe) {
      case 'hour':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' },
          day: { $dayOfMonth: '$publishedAt' },
          hour: { $hour: '$publishedAt' }
        };
        break;
      case 'day':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' },
          day: { $dayOfMonth: '$publishedAt' }
        };
        break;
      case 'week':
        groupStage = {
          year: { $year: '$publishedAt' },
          week: { $week: '$publishedAt' }
        };
        break;
      case 'month':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' }
        };
        break;
    }

    const pipeline = [
      {
        $match: {
          publishedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupStage,
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 as const }
    }
  ];

  const results = await Article.aggregate(pipeline);    return results.map(result => ({
      date: this.reconstructDate(result._id, timeframe),
      value: result.count,
      count: result.count
    }));
  }

  async getKeywordMetrics(keyword: string, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<KeywordMetrics> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = subDays(now, 7);
        break;
      case 'week':
        startDate = subDays(now, 30);
        break;
      case 'month':
        startDate = subDays(now, 90);
        break;
    }

    // Find articles containing the keyword
    const articles = await Article.find({
      keywords: { $in: [keyword] },
      publishedAt: { $gte: startDate, $lte: now }
    });

    const count = articles.length;
    const sentiment = articles.reduce((sum, article) => sum + article.sentiment.score, 0) / count || 0;

    // Get sources
    const sources = [...new Set(articles.map(article => article.source))];

    // Generate trend data
    const trend = await this.generateKeywordTrend(keyword, 'day', startDate, now);

    return {
      keyword,
      count,
      sentiment,
      trend,
      entities: {
        articles: count,
        averageSentiment: sentiment,
        sources
      }
    };
  }

  async getSourceMetrics(source: string, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<SourceMetrics> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'day':
        startDate = subDays(now, 7);
        break;
      case 'week':
        startDate = subDays(now, 30);
        break;
      case 'month':
        startDate = subDays(now, 90);
        break;
    }

    // Find articles from the source
    const articles = await Article.find({
      source,
      publishedAt: { $gte: startDate, $lte: now }
    });

    const count = articles.length;
    const sentiment = articles.reduce((sum, article) => sum + article.sentiment.score, 0) / count || 0;

    // Get category distribution
    const categoryDist: { [key: string]: number } = {};
    articles.forEach(article => {
      if (article.category) {
        categoryDist[article.category] = (categoryDist[article.category] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryDist)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Generate trend data
    const trend = await this.generateSourceTrend(source, 'day', startDate, now);

    return {
      source,
      count,
      sentiment,
      trend,
      categories
    };
  }

  async generateKeywordTrend(
    keyword: string,
    timeframe: 'hour' | 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ): Promise<TrendData[]> {
    let groupStage: any;
    let sortStage: Record<string, 1 | -1>;
    
    switch (timeframe) {
      case 'hour':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' },
          day: { $dayOfMonth: '$publishedAt' },
          hour: { $hour: '$publishedAt' }
        };
        sortStage = { '_id.year': 1 as const, '_id.month': 1 as const, '_id.day': 1 as const, '_id.hour': 1 as const };
        break;
      case 'day':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' },
          day: { $dayOfMonth: '$publishedAt' }
        };
        sortStage = { '_id.year': 1 as const, '_id.month': 1 as const, '_id.day': 1 as const };
        break;
      case 'week':
        groupStage = {
          year: { $year: '$publishedAt' },
          week: { $week: '$publishedAt' }
        };
        sortStage = { '_id.year': 1 as const, '_id.week': 1 as const };
        break;
      case 'month':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' }
        };
        sortStage = { '_id.year': 1 as const, '_id.month': 1 as const };
        break;
    }

    const pipeline = [
      {
        $match: {
          keywords: { $in: [keyword] },
          publishedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupStage,
          count: { $sum: 1 },
          averageSentiment: { $avg: '$sentiment.score' }
        }
      },
      {
        $sort: sortStage
      }
    ];    const results = await Article.aggregate(pipeline);
    
    return results.map(result => ({
      date: this.reconstructDate(result._id, timeframe),
      value: result.count,
      sentiment: result.averageSentiment,
      count: result.count
    }));
  }

  async generateSourceTrend(
    source: string,
    timeframe: 'hour' | 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date
  ): Promise<TrendData[]> {
    let groupStage: any;
    let sortStage: Record<string, 1 | -1>;

    switch (timeframe) {
      case 'hour':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' },
          day: { $dayOfMonth: '$publishedAt' },
          hour: { $hour: '$publishedAt' }
        };
        sortStage = { '_id.year': 1 as const, '_id.month': 1 as const, '_id.day': 1 as const, '_id.hour': 1 as const };
        break;
      case 'day':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' },
          day: { $dayOfMonth: '$publishedAt' }
        };
        sortStage = { '_id.year': 1 as const, '_id.month': 1 as const, '_id.day': 1 as const };
        break;
      case 'week':
        groupStage = {
          year: { $year: '$publishedAt' },
          week: { $week: '$publishedAt' }
        };
        sortStage = { '_id.year': 1 as const, '_id.week': 1 as const };
        break;
      case 'month':
        groupStage = {
          year: { $year: '$publishedAt' },
          month: { $month: '$publishedAt' }
        };
        sortStage = { '_id.year': 1 as const, '_id.month': 1 as const };
        break;
    }

    const pipeline = [
      {
        $match: {
          source,
          publishedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupStage,
          count: { $sum: 1 },
          averageSentiment: { $avg: '$sentiment.score' }
        }
      },
      {
        $sort: sortStage
      }
    ];

    const results = await Article.aggregate(pipeline);
    
    return results.map(result => ({
      date: this.reconstructDate(result._id, timeframe),
      value: result.count,
      sentiment: result.averageSentiment,
      count: result.count
    }));
  }

  private reconstructDate(groupId: any, timeframe: 'hour' | 'day' | 'week' | 'month'): Date {
    switch (timeframe) {
      case 'hour':
        return new Date(groupId.year, groupId.month - 1, groupId.day, groupId.hour);
      case 'day':
        return new Date(groupId.year, groupId.month - 1, groupId.day);
      case 'week':
        // Approximate week start
        const weekStart = new Date(groupId.year, 0, 1);
        weekStart.setDate(weekStart.getDate() + (groupId.week - 1) * 7);
        return weekStart;
      case 'month':
        return new Date(groupId.year, groupId.month - 1, 1);
      default:
        return new Date();
    }
  }

  async checkAlerts(): Promise<void> {
    const trackedKeywords = await KeywordTrack.find({ isActive: true });
    
    for (const keywordTrack of trackedKeywords) {
      try {
        await this.checkKeywordAlerts(keywordTrack);
      } catch (error) {
        console.error(`Error checking alerts for keyword ${keywordTrack.keyword}:`, error);
      }
    }
  }

  private async checkKeywordAlerts(keywordTrack: any): Promise<void> {
    const now = new Date();
    const oneDayAgo = subDays(now, 1);
    const twoDaysAgo = subDays(now, 2);

    // Get recent articles
    const recentArticles = await Article.find({
      keywords: { $in: [keywordTrack.keyword] },
      publishedAt: { $gte: oneDayAgo, $lte: now }
    });

    // Get previous period articles for comparison
    const previousArticles = await Article.find({
      keywords: { $in: [keywordTrack.keyword] },
      publishedAt: { $gte: twoDaysAgo, $lt: oneDayAgo }
    });

    // Check volume spike
    const recentCount = recentArticles.length;
    const previousCount = previousArticles.length;
    const volumeChange = previousCount > 0 ? ((recentCount - previousCount) / previousCount) * 100 : 0;

    if (volumeChange >= keywordTrack.alertThreshold.volumeSpike) {
      await this.createAlert('volume_spike', keywordTrack.keyword, {
        message: `Volume spike detected for "${keywordTrack.keyword}": ${volumeChange.toFixed(1)}% increase`,
        severity: volumeChange > 100 ? 'high' : 'medium',
        data: {
          keyword: keywordTrack.keyword,
          recentCount,
          previousCount,
          volumeChange
        }
      });
    }

    // Check sentiment change
    if (recentArticles.length > 0 && previousArticles.length > 0) {
      const recentSentiment = recentArticles.reduce((sum, article) => sum + article.sentiment.score, 0) / recentArticles.length;
      const previousSentiment = previousArticles.reduce((sum, article) => sum + article.sentiment.score, 0) / previousArticles.length;
      const sentimentChange = Math.abs(recentSentiment - previousSentiment) * 100;

      if (sentimentChange >= keywordTrack.alertThreshold.sentimentChange) {
        await this.createAlert('sentiment_change', keywordTrack.keyword, {
          message: `Sentiment change detected for "${keywordTrack.keyword}": ${sentimentChange.toFixed(1)}% change`,
          severity: sentimentChange > 50 ? 'high' : 'medium',
          data: {
            keyword: keywordTrack.keyword,
            recentSentiment,
            previousSentiment,
            sentimentChange
          }
        });
      }
    }
  }

  private async createAlert(type: string, keyword: string, alertData: any): Promise<void> {
    const alert = new Alert({
      type,
      keyword,
      message: alertData.message,
      severity: alertData.severity,
      isRead: false,
      isSent: false,
      data: alertData.data
    });

    await alert.save();
    console.log(`Alert created: ${alertData.message}`);
  }

  async generateAndCacheAnalytics(): Promise<void> {
    console.log('Generating and caching analytics...');

    const timeframes: Array<'hour' | 'day' | 'week' | 'month'> = ['hour', 'day', 'week', 'month'];
    
    for (const timeframe of timeframes) {
      try {
        const now = new Date();
        let dateToCache: Date;

        switch (timeframe) {
          case 'hour':
            dateToCache = startOfHour(now);
            break;
          case 'day':
            dateToCache = startOfDay(now);
            break;
          case 'week':
            dateToCache = startOfWeek(now);
            break;
          case 'month':
            dateToCache = startOfMonth(now);
            break;
        }

        // Check if analytics already exist for this period
        const existingAnalytics = await Analytics.findOne({
          date: dateToCache,
          timeframe
        });

        if (existingAnalytics) {
          console.log(`Analytics already exist for ${timeframe} at ${dateToCache}`);
          continue;
        }

        // Generate metrics
        const metrics = await this.generateDashboardMetrics(timeframe);

        // Save analytics
        const analytics = new Analytics({
          date: dateToCache,
          timeframe,
          metrics: {
            totalArticles: metrics.overview.totalArticles,
            sentimentDistribution: metrics.overview.sentimentDistribution,
            averageSentiment: metrics.overview.averageSentiment,
            topKeywords: metrics.overview.topKeywords,
            topSources: metrics.overview.topSources,
            topEntities: {
              companies: [],
              people: [],
              technologies: []
            },
            languageDistribution: [],
            categoryDistribution: []
          }
        });

        await analytics.save();
        console.log(`Cached analytics for ${timeframe} at ${dateToCache}`);

      } catch (error) {
        console.error(`Error caching analytics for ${timeframe}:`, error);
      }
    }

    console.log('Analytics caching completed');
  }
}

export default new AnalyticsService();
