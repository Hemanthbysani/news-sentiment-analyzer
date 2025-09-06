import { Article, Analytics, Alert, KeywordTrack } from '@/models';
import { subDays, subHours } from 'date-fns';

export interface TrendData {
  date: Date;
  value: number;
  sentiment?: number;
  count?: number;
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
    sentiment: TrendData[];
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
    limit: number = 1000
  ): Promise<DashboardMetrics> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'hour':
        startDate = subHours(now, 24);
        break;
      case 'day':
        startDate = subDays(now, 30);
        break;
      case 'week':
        startDate = subDays(now, 90);
        break;
      case 'month':
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 30);
    }

    // Get articles in the time range
    const articles = await Article.find({
      publishedAt: { $gte: startDate, $lte: now }
    }).sort({ publishedAt: -1 }).limit(limit);

    // Calculate overview metrics
    const totalArticles = articles.length;
    const averageSentiment = totalArticles > 0 
      ? articles.reduce((sum, article) => sum + article.sentiment.score, 0) / totalArticles 
      : 0;
    
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
        sentiment: data.count > 0 ? data.sentiment / data.count : 0
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
        sentiment: data.count > 0 ? data.sentiment / data.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate simple trends (last 7 days)
    const sentimentTrend = await this.generateSimpleTrend(startDate, now, 'sentiment');
    const volumeTrend = await this.generateSimpleTrend(startDate, now, 'volume');

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

  private async generateSimpleTrend(
    startDate: Date, 
    endDate: Date, 
    type: 'sentiment' | 'volume'
  ): Promise<TrendData[]> {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const trends: TrendData[] = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayArticles = await Article.find({
        publishedAt: { $gte: dayStart, $lt: dayEnd }
      });

      if (type === 'sentiment') {
        const avgSentiment = dayArticles.length > 0
          ? dayArticles.reduce((sum, article) => sum + article.sentiment.score, 0) / dayArticles.length
          : 0;
        
        trends.push({
          date: dayStart,
          value: avgSentiment,
          sentiment: avgSentiment,
          count: dayArticles.length
        });
      } else {
        trends.push({
          date: dayStart,
          value: dayArticles.length,
          count: dayArticles.length
        });
      }
    }

    return trends;
  }

  async getKeywordMetrics(keyword: string, days: number = 7) {
    const now = new Date();
    const startDate = subDays(now, days);

    const articles = await Article.find({
      keywords: { $in: [keyword] },
      publishedAt: { $gte: startDate, $lte: now }
    });

    const count = articles.length;
    const sentiment = count > 0 
      ? articles.reduce((sum, article) => sum + article.sentiment.score, 0) / count 
      : 0;

    const sources = [...new Set(articles.map(article => article.source))];
    const trend = await this.generateKeywordTrend(keyword, startDate, now);

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

  private async generateKeywordTrend(keyword: string, startDate: Date, endDate: Date): Promise<TrendData[]> {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const trends: TrendData[] = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayArticles = await Article.find({
        keywords: { $in: [keyword] },
        publishedAt: { $gte: dayStart, $lt: dayEnd }
      });

      const avgSentiment = dayArticles.length > 0
        ? dayArticles.reduce((sum, article) => sum + article.sentiment.score, 0) / dayArticles.length
        : 0;

      trends.push({
        date: dayStart,
        value: dayArticles.length,
        sentiment: avgSentiment,
        count: dayArticles.length
      });
    }

    return trends;
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
}

export default new AnalyticsService();
