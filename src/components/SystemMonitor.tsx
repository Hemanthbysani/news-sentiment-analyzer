'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Server,
  Cpu,
  HardDrive,
  Zap,
  TrendingUp,
  Eye,
  Filter
} from 'lucide-react';

interface SystemStatus {
  status: {
    health: 'healthy' | 'warning' | 'error';
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    timestamp: string;
  };
  metrics: {
    totalArticles: number;
    articlesLast24h: number;
    articlesLastHour: number;
    processingRate: string;
    lastAnalyticsUpdate: string;
  };
  activity: {
    recentLogs: SystemLog[];
    recentErrors: SystemLog[];
    errorCount: number;
  };
}

interface SystemLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

export default function SystemMonitor() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('all');
  const [showDetails, setShowDetails] = useState<string>('');

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-logs?action=status');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (level?: string) => {
    try {
      const url = level && level !== 'all' 
        ? `/api/system-logs?level=${level}&limit=100`
        : '/api/system-logs?limit=100';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs(selectedLogLevel);
  }, [selectedLogLevel]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemStatus();
        fetchLogs(selectedLogLevel);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedLogLevel]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      default: return Activity;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-400 bg-blue-900/20';
      case 'success': return 'text-green-400 bg-green-900/20';
      case 'warning': return 'text-yellow-400 bg-yellow-900/20';
      case 'error': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">System Monitor</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh</span>
            </label>
            
            <button
              onClick={() => {
                fetchSystemStatus();
                fetchLogs(selectedLogLevel);
              }}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {systemStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* System Health */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">System Health</p>
                  <p className={`text-lg font-semibold capitalize ${getHealthColor(systemStatus.status.health)}`}>
                    {systemStatus.status.health}
                  </p>
                </div>
                {(() => {
                  const HealthIcon = getHealthIcon(systemStatus.status.health);
                  return <HealthIcon className={`h-8 w-8 ${getHealthColor(systemStatus.status.health)}`} />;
                })()}
              </div>
            </div>

            {/* Uptime */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Uptime</p>
                  <p className="text-lg font-semibold text-white">
                    {formatUptime(systemStatus.status.uptime)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Memory Usage</p>
                  <p className="text-lg font-semibold text-white">
                    {formatBytes(systemStatus.status.memory.heapUsed)}
                  </p>
                  <p className="text-xs text-gray-500">
                    / {formatBytes(systemStatus.status.memory.heapTotal)}
                  </p>
                </div>
                <Cpu className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            {/* Processing Rate */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Processing Rate</p>
                  <p className="text-lg font-semibold text-white">
                    {systemStatus.metrics.processingRate}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        {systemStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Articles Processed</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total:</span>
                  <span className="text-white font-semibold">{systemStatus.metrics.totalArticles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Last 24h:</span>
                  <span className="text-white font-semibold">{systemStatus.metrics.articlesLast24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Last hour:</span>
                  <span className="text-white font-semibold">{systemStatus.metrics.articlesLastHour}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Error Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Recent errors:</span>
                  <span className={`font-semibold ${
                    systemStatus.activity.errorCount > 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {systemStatus.activity.errorCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total logs:</span>
                  <span className="text-white font-semibold">{systemStatus.activity.recentLogs.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Last Analytics Update</h3>
              <p className="text-white">
                {systemStatus.metrics.lastAnalyticsUpdate 
                  ? formatDate(systemStatus.metrics.lastAnalyticsUpdate)
                  : 'No data'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* System Logs */}
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">System Logs</h3>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedLogLevel}
              onChange={(e) => setSelectedLogLevel(e.target.value)}
              className="bg-gray-800 text-white rounded px-3 py-1 text-sm border border-gray-700"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={`${log.timestamp}-${index}`} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-400">{formatDate(log.timestamp)}</span>
                  </div>
                  
                  <p className="text-white">{log.message}</p>
                  
                  {log.details && (
                    <button
                      onClick={() => setShowDetails(showDetails === `${log.timestamp}-${index}` ? '' : `${log.timestamp}-${index}`)}
                      className="mt-2 flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Show Details</span>
                    </button>
                  )}
                </div>
              </div>

              {showDetails === `${log.timestamp}-${index}` && log.details && (
                <div className="mt-3 p-3 bg-gray-700 rounded">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
