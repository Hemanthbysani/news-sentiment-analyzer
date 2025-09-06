import mongoose, { Schema, Document } from 'mongoose';

// Article Model
export interface IArticle extends Document {
  title: string;
  description: string;
  content: string;
  url: string;
  urlHash: string;
  source: string;
  author?: string;
  publishedAt: Date;
  imageUrl?: string;
  category?: string;
  language: string;
  sentiment: {
    score: number; // -1 to 1 (negative to positive)
    confidence: number; // 0 to 1
    label: 'positive' | 'negative' | 'neutral';
    emotions?: {
      joy?: number;
      anger?: number;
      fear?: number;
      sadness?: number;
      surprise?: number;
      disgust?: number;
    };
  };
  keywords: string[];
  entities: {
    person: string[];
    organization: string[];
    location: string[];
    technology: string[];
    other: string[];
  };
  metrics: {
    readability: number;
    wordCount: number;
    socialShares?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ArticleSchema = new Schema<IArticle>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  urlHash: { type: String, required: true, unique: true, index: true },
  source: { type: String, required: true, index: true },
  author: { type: String },
  publishedAt: { type: Date, required: true, index: true },
  imageUrl: { type: String },
  category: { type: String, index: true },
  language: { type: String, default: 'en', index: true },
  sentiment: {
    score: { type: Number, required: true, min: -1, max: 1 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    label: { type: String, enum: ['positive', 'negative', 'neutral'], required: true },
    emotions: {
      joy: { type: Number, min: 0, max: 1 },
      anger: { type: Number, min: 0, max: 1 },
      fear: { type: Number, min: 0, max: 1 },
      sadness: { type: Number, min: 0, max: 1 },
      surprise: { type: Number, min: 0, max: 1 },
      disgust: { type: Number, min: 0, max: 1 }
    }
  },
  keywords: [{ type: String, index: true }],
  entities: {
    person: [{ type: String, index: true }],
    organization: [{ type: String, index: true }],
    location: [{ type: String, index: true }],
    technology: [{ type: String, index: true }],
    other: [{ type: String, index: true }]
  },
  metrics: {
    readability: { type: Number },
    wordCount: { type: Number },
    socialShares: { type: Number }
  }
}, {
  timestamps: true
});

// Create indexes
ArticleSchema.index({ publishedAt: -1 });
ArticleSchema.index({ 'sentiment.score': 1 });
ArticleSchema.index({ 'sentiment.label': 1 });
ArticleSchema.index({ source: 1, publishedAt: -1 });
ArticleSchema.index({ keywords: 1 });
ArticleSchema.index({ 'entities.organization': 1 });
ArticleSchema.index({ 'entities.person': 1 });
ArticleSchema.index({ 'entities.technology': 1 });

// Keyword Tracking Model
export interface IKeywordTrack extends Document {
  keyword: string;
  category: 'company' | 'technology' | 'person' | 'event' | 'custom';
  isActive: boolean;
  alertThreshold: {
    sentimentChange: number; // percentage change that triggers alert
    volumeSpike: number; // volume increase that triggers alert
  };
  createdAt: Date;
  updatedAt: Date;
}

const KeywordTrackSchema = new Schema<IKeywordTrack>({
  keyword: { type: String, required: true, unique: true, index: true },
  category: { 
    type: String, 
    enum: ['company', 'technology', 'person', 'event', 'custom'], 
    required: true,
    index: true 
  },
  isActive: { type: Boolean, default: true, index: true },
  alertThreshold: {
    sentimentChange: { type: Number, default: 20 }, // 20% change
    volumeSpike: { type: Number, default: 50 } // 50% increase
  }
}, {
  timestamps: true
});

// Analytics Model for pre-computed metrics
export interface IAnalytics extends Document {
  date: Date;
  timeframe: 'hour' | 'day' | 'week' | 'month';
  metrics: {
    totalArticles: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
    averageSentiment: number;
    topKeywords: Array<{ keyword: string; count: number; sentiment: number }>;
    topSources: Array<{ source: string; count: number; sentiment: number }>;
    topEntities: {
      companies: Array<{ name: string; count: number; sentiment: number }>;
      people: Array<{ name: string; count: number; sentiment: number }>;
      technologies: Array<{ name: string; count: number; sentiment: number }>;
    };
    languageDistribution: Array<{ language: string; count: number }>;
    categoryDistribution: Array<{ category: string; count: number }>;
  };
  createdAt: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>({
  date: { type: Date, required: true, index: true },
  timeframe: { 
    type: String, 
    enum: ['hour', 'day', 'week', 'month'], 
    required: true,
    index: true 
  },
  metrics: {
    totalArticles: { type: Number, required: true },
    sentimentDistribution: {
      positive: { type: Number, required: true },
      negative: { type: Number, required: true },
      neutral: { type: Number, required: true }
    },
    averageSentiment: { type: Number, required: true },
    topKeywords: [{
      keyword: { type: String, required: true },
      count: { type: Number, required: true },
      sentiment: { type: Number, required: true }
    }],
    topSources: [{
      source: { type: String, required: true },
      count: { type: Number, required: true },
      sentiment: { type: Number, required: true }
    }],
    topEntities: {
      companies: [{
        name: { type: String, required: true },
        count: { type: Number, required: true },
        sentiment: { type: Number, required: true }
      }],
      people: [{
        name: { type: String, required: true },
        count: { type: Number, required: true },
        sentiment: { type: Number, required: true }
      }],
      technologies: [{
        name: { type: String, required: true },
        count: { type: Number, required: true },
        sentiment: { type: Number, required: true }
      }]
    },
    languageDistribution: [{
      language: { type: String, required: true },
      count: { type: Number, required: true }
    }],
    categoryDistribution: [{
      category: { type: String, required: true },
      count: { type: Number, required: true }
    }]
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Create indexes
AnalyticsSchema.index({ date: -1, timeframe: 1 });
AnalyticsSchema.index({ timeframe: 1, date: -1 });

// Alert Model
export interface IAlert extends Document {
  type: 'sentiment_change' | 'volume_spike' | 'keyword_mention' | 'custom';
  keyword?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  isSent: boolean;
  data: any; // Additional data related to the alert
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>({
  type: { 
    type: String, 
    enum: ['sentiment_change', 'volume_spike', 'keyword_mention', 'custom'], 
    required: true,
    index: true 
  },
  keyword: { type: String, index: true },
  message: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    required: true,
    index: true 
  },
  isRead: { type: Boolean, default: false, index: true },
  isSent: { type: Boolean, default: false, index: true },
  data: { type: Schema.Types.Mixed }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Create indexes
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ isRead: 1, createdAt: -1 });
AlertSchema.index({ severity: 1, isRead: 1 });

// RSS Feed Source Model
export interface IRSSSource extends Document {
  name: string;
  url: string;
  category: string;
  isActive: boolean;
  lastFetched?: Date;
  lastSuccessful?: Date;
  errorCount: number;
  lastError?: string;
  settings: {
    fetchInterval: number; // minutes
    maxArticles: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RSSSourceSchema = new Schema<IRSSSource>({
  name: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  category: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  lastFetched: { type: Date },
  lastSuccessful: { type: Date },
  errorCount: { type: Number, default: 0 },
  lastError: { type: String },
  settings: {
    fetchInterval: { type: Number, default: 15 }, // 15 minutes
    maxArticles: { type: Number, default: 50 }
  }
}, {
  timestamps: true
});

// Export models
export const Article = mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);
export const KeywordTrack = mongoose.models.KeywordTrack || mongoose.model<IKeywordTrack>('KeywordTrack', KeywordTrackSchema);
export const Analytics = mongoose.models.Analytics || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
export const Alert = mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);
export const RSSSource = mongoose.models.RSSSource || mongoose.model<IRSSSource>('RSSSource', RSSSourceSchema);
