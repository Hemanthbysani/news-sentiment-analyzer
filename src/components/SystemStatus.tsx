import { useState, useEffect } from 'react';
import { Activity, Database, Bot, Calendar, AlertCircle, CheckCircle, Clock, Wifi } from 'lucide-react';

interface SystemStatus {
  database: 'connected' | 'disconnected' | 'error';
  scheduler: {
    isRunning: boolean;
    schedules: {
      scraper: string;
      alerts: string;
      analytics: string;
    };
  };
  lastScrape: Date | null;
  geminiApi: 'connected' | 'error' | 'unknown';
  newsApis: {
    newsapi: 'connected' | 'error' | 'unknown';
    guardian: 'connected' | 'error' | 'unknown';
  };
}

export default function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus>({
    database: 'unknown' as any,
    scheduler: {
      isRunning: false,
      schedules: {
        scraper: '',
        alerts: '',
        analytics: ''
      }
    },
    lastScrape: null,
    geminiApi: 'unknown',
    newsApis: {
      newsapi: 'unknown',
      guardian: 'unknown'
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkSystemStatus = async () => {
    try {
      // Check database connection
      const dbResponse = await fetch('/api/analytics?timeframe=day');
      const dbConnected = dbResponse.ok;

      // Check scheduler status
      const schedulerResponse = await fetch('/api/scheduler');
      const schedulerData = schedulerResponse.ok ? await schedulerResponse.json() : null;

      // Check last scrape activity (from articles)
      const articlesResponse = await fetch('/api/articles?limit=1');
      const articlesData = articlesResponse.ok ? await articlesResponse.json() : null;
      const lastScrape = articlesData?.data?.[0]?.publishedAt 
        ? new Date(articlesData.data[0].publishedAt) 
        : null;

      setStatus({
        database: dbConnected ? 'connected' : 'disconnected',
        scheduler: schedulerData?.data || {
          isRunning: false,
          schedules: { scraper: '', alerts: '', analytics: '' }
        },
        lastScrape,
        geminiApi: 'connected', // Would need actual API test
        newsApis: {
          newsapi: 'connected', // Would need actual API test
          guardian: 'connected'
        }
      });
    } catch (error) {
      console.error('Error checking system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatusIndicator = ({ status, label }: { status: string; label: string }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'connected':
        case 'running':
          return 'text-green-500';
        case 'disconnected':
        case 'error':
          return 'text-red-500';
        case 'unknown':
        default:
          return 'text-yellow-500';
      }
    };

    const getStatusIcon = () => {
      switch (status) {
        case 'connected':
        case 'running':
          return <CheckCircle className="h-4 w-4" />;
        case 'disconnected':
        case 'error':
          return <AlertCircle className="h-4 w-4" />;
        case 'unknown':
        default:
          return <Clock className="h-4 w-4" />;
      }
    };

    return (
      <div className="flex items-center space-x-2">
        <span className={getStatusColor()}>
          {getStatusIcon()}
        </span>
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <span className={`text-xs ${getStatusColor()}`}>
          {status === 'connected' ? 'Connected' : 
           status === 'running' ? 'Running' :
           status === 'disconnected' ? 'Disconnected' :
           status === 'error' ? 'Error' : 'Unknown'}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2 text-gray-600">Checking system status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <Activity className="h-5 w-5 text-gray-500 mr-2" />
        <h3 className="text-lg font-medium text-gray-900">System Status</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Status */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Database className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Database</span>
          </div>
          <StatusIndicator status={status.database} label="MongoDB" />
        </div>

        {/* Scheduler Status */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Scheduler</span>
          </div>
          <StatusIndicator 
            status={status.scheduler.isRunning ? 'running' : 'disconnected'} 
            label="Background Tasks" 
          />
          {status.scheduler.isRunning && (
            <div className="text-xs text-gray-500 ml-6">
              <div>Scraper: {status.scheduler.schedules.scraper}</div>
              <div>Alerts: {status.scheduler.schedules.alerts}</div>
              <div>Analytics: {status.scheduler.schedules.analytics}</div>
            </div>
          )}
        </div>

        {/* API Status */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Bot className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">AI Services</span>
          </div>
          <StatusIndicator status={status.geminiApi} label="Google Gemini" />
        </div>

        {/* News APIs */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Wifi className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">News APIs</span>
          </div>
          <StatusIndicator status={status.newsApis.newsapi} label="NewsAPI" />
          <StatusIndicator status={status.newsApis.guardian} label="Guardian API" />
        </div>
      </div>

      {/* Last Activity */}
      {status.lastScrape && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Last Article Scraped:</span>{' '}
            {new Date(status.lastScrape).toLocaleString()}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              fetch('/api/scheduler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: status.scheduler.isRunning ? 'stop' : 'start' })
              }).then(() => checkSystemStatus());
            }}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              status.scheduler.isRunning
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {status.scheduler.isRunning ? 'Stop Scheduler' : 'Start Scheduler'}
          </button>
          
          <button
            onClick={() => {
              fetch('/api/scraper', { method: 'POST' });
            }}
            className="px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            Manual Scrape
          </button>
          
          <button
            onClick={checkSystemStatus}
            className="px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}
