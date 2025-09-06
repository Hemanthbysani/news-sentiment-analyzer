'use client';

import React, { useState, useEffect } from 'react';
import SystemStatus from '@/components/SystemStatus';
import DatabaseManager from '@/components/DatabaseManager';
import SystemMonitor from '@/components/SystemMonitor';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Bell,
  BarChart3,
  PieChart,
  Calendar,
  Database,
  Monitor,
  Home
} from 'lucide-react';

interface Article {
  _id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  author?: string;
  publishedAt: string;
  imageUrl?: string;
  category?: string;
  sentiment: {
    score: number;
    confidence: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  keywords: string[];
}

interface DashboardMetrics {
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
    sentiment: Array<{ date: string; value: number; count: number }>;
    volume: Array<{ date: string; value: number; count: number }>;
  };
}

export default function Dashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState('');
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('day');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'monitor'>('dashboard');
  const [newArticleIds, setNewArticleIds] = useState<Set<string>>(new Set());
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'monitor', name: 'System Monitor', icon: Monitor },
  ];

  // Real-time polling effect
  useEffect(() => {
    if (!isAutoRefreshEnabled || activeTab !== 'dashboard') return;

    const interval = setInterval(() => {
      loadDashboardDataRealtime();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled, activeTab, lastUpdateTime]);

  useEffect(() => {
    loadDashboardData();
  }, [timeframe]);

  // Clear "new" indicators after 30 seconds
  useEffect(() => {
    if (newArticleIds.size > 0) {
      const timeout = setTimeout(() => {
        setNewArticleIds(new Set());
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [newArticleIds]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [articlesRes, metricsRes] = await Promise.all([
        fetch('/api/articles?limit=20'),
        fetch(`/api/analytics?timeframe=${timeframe}`)
      ]);

      if (articlesRes.ok) {
        const articlesData = await articlesRes.json();
        setArticles(articlesData.articles || []);
        setLastUpdateTime(new Date());
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardDataRealtime = async () => {
    try {
      const [articlesRes, metricsRes] = await Promise.all([
        fetch('/api/articles?limit=20'),
        fetch(`/api/analytics?timeframe=${timeframe}`)
      ]);

      if (articlesRes.ok) {
        const articlesData = await articlesRes.json();
        const newArticles = articlesData.articles || [];
        
        // Find new articles by comparing with current articles
        const currentIds = new Set(articles.map(a => a._id));
        const newIds = new Set<string>();
        
        newArticles.forEach((article: Article) => {
          if (!currentIds.has(article._id)) {
            newIds.add(article._id);
          }
        });

        if (newIds.size > 0) {
          setNewArticleIds(newIds);
          // Show notification for new articles
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${newIds.size} new articles added`, {
              body: 'Fresh news content is now available',
              icon: '/favicon.ico'
            });
          }
        }

        setArticles(newArticles);
        setLastUpdateTime(new Date());
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Error loading real-time data:', error);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const toggleAutoRefresh = () => {
    setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleScrape = async () => {
    try {
      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        alert('Scraping started! New articles will appear automatically.');
        // Enable auto-refresh if it was disabled
        setIsAutoRefreshEnabled(true);
      }
    } catch (error) {
      console.error('Error starting scrape:', error);
      alert('Error starting scrape');
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return 'text-green-400';
    if (sentiment < -0.1) return 'text-red-400';
    return 'text-gray-400';
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.1) return <TrendingUp className="w-4 h-4" />;
    if (sentiment < -0.1) return <TrendingDown className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold">News Sentiment Analyzer</h1>
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-gray-400" />
                {metrics && metrics.overview.recentAlerts > 0 && (
                  <span className="bg-red-600 text-xs px-2 py-1 rounded-full">
                    {metrics.overview.recentAlerts}
                  </span>
                )}
                {isAutoRefreshEnabled && (
                  <span className="text-green-400 text-sm flex items-center space-x-1">
                    <Activity className="w-3 h-3 animate-pulse" />
                    <span>Live</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Last updated: {lastUpdateTime.toLocaleTimeString()}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {activeTab === 'dashboard' && (
                <>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as 'day' | 'week' | 'month')}
                    className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
                  >
                    <option value="day">Last 24 Hours</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                  </select>
                  <button
                    onClick={toggleAutoRefresh}
                    className={`px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors ${
                      isAutoRefreshEnabled 
                        ? 'bg-green-700 hover:bg-green-600 text-green-100' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <Activity className={`w-3 h-3 ${isAutoRefreshEnabled ? 'animate-pulse' : ''}`} />
                    <span>{isAutoRefreshEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    onClick={handleScrape}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Scrape News</span>
                  </button>
                </>
              )}
              <button
                onClick={handleRefresh}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-500'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Metrics Overview */}
            {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Articles</p>
                  <p className="text-2xl font-bold">{metrics.overview.totalArticles}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg Sentiment</p>
                  <div className="flex items-center space-x-2">
                    <p className={`text-2xl font-bold ${getSentimentColor(metrics.overview.averageSentiment)}`}>
                      {metrics.overview.averageSentiment.toFixed(2)}
                    </p>
                    {getSentimentIcon(metrics.overview.averageSentiment)}
                  </div>
                </div>
                <Activity className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Sentiment Distribution</p>
                  <div className="flex space-x-4 mt-2">
                    <div className="text-center">
                      <p className="text-green-400 font-bold">{metrics.overview.sentimentDistribution.positive}</p>
                      <p className="text-xs text-gray-400">Positive</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 font-bold">{metrics.overview.sentimentDistribution.neutral}</p>
                      <p className="text-xs text-gray-400">Neutral</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-400 font-bold">{metrics.overview.sentimentDistribution.negative}</p>
                      <p className="text-xs text-gray-400">Negative</p>
                    </div>
                  </div>
                </div>
                <PieChart className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Recent Alerts</p>
                  <p className="text-2xl font-bold text-red-400">{metrics.overview.recentAlerts}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>
        )}

        {/* Top Keywords and Sources */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Top Keywords</h3>
              <div className="space-y-3">
                {metrics.overview.topKeywords.slice(0, 5).map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-300">{keyword.keyword}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">{keyword.count}</span>
                      <span className={`text-sm ${getSentimentColor(keyword.sentiment)}`}>
                        {keyword.sentiment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Top Sources</h3>
              <div className="space-y-3">
                {metrics.overview.topSources.slice(0, 5).map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-300">{source.source}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">{source.count}</span>
                      <span className={`text-sm ${getSentimentColor(source.sentiment)}`}>
                        {source.sentiment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="mb-8">
          <SystemStatus />
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-400"
              />
            </div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            >
              <option value="">All Sources</option>
              {metrics?.overview.topSources.map((source, index) => (
                <option key={index} value={source.source}>{source.source}</option>
              ))}
            </select>
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>

        {/* Articles List */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold">Recent Articles</h3>
                {newArticleIds.size > 0 && (
                  <span className="bg-blue-600 text-xs px-2 py-1 rounded-full text-white animate-bounce">
                    {newArticleIds.size} new
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-400">
                {articles.length} total articles
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-800">
            {articles.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>No articles found. Try scraping some news sources!</p>
                <button
                  onClick={handleScrape}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-white"
                >
                  Start Scraping
                </button>
              </div>
            ) : (
              articles
                .filter(article => 
                  (!searchTerm || article.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
                  (!selectedSource || article.source === selectedSource) &&
                  (!selectedSentiment || article.sentiment.label === selectedSentiment)
                )
                .map((article) => {
                  const isNew = newArticleIds.has(article._id);
                  return (
                    <div 
                      key={article._id} 
                      className={`p-6 hover:bg-gray-800 transition-all duration-500 transform ${
                        isNew 
                          ? 'bg-gradient-to-r from-blue-900/20 to-transparent border-l-4 border-l-blue-500 animate-pulse' 
                          : ''
                      }`}
                      style={{
                        animation: isNew ? 'slideInFromTop 0.5s ease-out' : undefined
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {isNew && (
                              <span className="bg-blue-600 text-xs px-2 py-1 rounded-full text-white animate-bounce">
                                NEW
                              </span>
                            )}
                            <span className="text-sm text-gray-400">{article.source}</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-sm text-gray-400">{formatDate(article.publishedAt)}</span>
                            <div className={`flex items-center space-x-1 ${getSentimentColor(article.sentiment.score)}`}>
                              {getSentimentIcon(article.sentiment.score)}
                              <span className="text-sm">{article.sentiment.score.toFixed(2)}</span>
                            </div>
                          </div>
                          <h4 className="text-lg font-medium mb-2 text-white">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-400 transition-colors"
                            >
                              {article.title}
                            </a>
                          </h4>
                          <p className="text-gray-400 mb-3">{article.description}</p>
                          {article.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {article.keywords.slice(0, 5).map((keyword, index) => (
                                <span
                                  key={index}
                                  className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-300"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {article.imageUrl && (
                          <img
                            src={article.imageUrl}
                            alt={article.title}
                            className="w-24 h-16 object-cover rounded ml-4"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
        </>
        )}

        {activeTab === 'database' && <DatabaseManager />}
        
        {activeTab === 'monitor' && <SystemMonitor />}
      </div>
    </div>
  );
}
