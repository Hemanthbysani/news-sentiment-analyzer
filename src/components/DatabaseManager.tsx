'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  FileText,
  BarChart3,
  Bell,
  Tag,
  Rss
} from 'lucide-react';

interface DatabaseStats {
  collections: {
    articles: { count: number; latest: any };
    analytics: { count: number; latest: any };
    alerts: { count: number; latest: any };
    keywordTracks: { count: number };
    rssSources: { count: number };
  };
  totalDocuments: number;
}

interface CollectionData {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function DatabaseManager() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [collectionData, setCollectionData] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string>('');

  const collections = [
    { key: 'articles', name: 'Articles', icon: FileText, color: 'text-blue-500' },
    { key: 'analytics', name: 'Analytics', icon: BarChart3, color: 'text-green-500' },
    { key: 'alerts', name: 'Alerts', icon: Bell, color: 'text-yellow-500' },
    { key: 'keywords', name: 'Keywords', icon: Tag, color: 'text-purple-500' },
    { key: 'rss-sources', name: 'RSS Sources', icon: Rss, color: 'text-orange-500' },
  ];

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/database?action=stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionData = async (collection: string, page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/database?collection=${collection}&page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setCollectionData(data);
      }
    } catch (error) {
      console.error('Failed to fetch collection data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (collection: string, id?: string) => {
    try {
      setDeleting(true);
      const url = id 
        ? `/api/database?collection=${collection}&id=${id}`
        : `/api/database?collection=${collection}`;
      
      const response = await fetch(url, { method: 'DELETE' });
      
      if (response.ok) {
        await fetchStats();
        if (selectedCollection === collection) {
          await fetchCollectionData(collection);
        }
        setShowConfirm('');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleting(false);
    }
  };

  const clearAllData = async () => {
    try {
      setDeleting(true);
      const response = await fetch('/api/database?action=clear-all', { method: 'DELETE' });
      
      if (response.ok) {
        await fetchStats();
        setCollectionData(null);
        setSelectedCollection('');
        setShowConfirm('');
      }
    } catch (error) {
      console.error('Failed to clear all data:', error);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      fetchCollectionData(selectedCollection);
    }
  }, [selectedCollection]);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const renderCollectionPreview = (item: any, collection: string) => {
    switch (collection) {
      case 'articles':
        return (
          <div className="space-y-2">
            <div className="font-medium text-white truncate">{item.title}</div>
            <div className="text-sm text-gray-400">
              Source: {item.source} | Published: {formatDate(item.publishedAt)}
            </div>
            {item.sentiment && (
              <div className="text-sm">
                <span className={`px-2 py-1 rounded text-xs ${
                  item.sentiment.label === 'positive' ? 'bg-green-900 text-green-300' :
                  item.sentiment.label === 'negative' ? 'bg-red-900 text-red-300' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {item.sentiment.label} ({(item.sentiment.score * 100).toFixed(0)}%)
                </span>
              </div>
            )}
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-2">
            <div className="font-medium text-white">Analytics for {formatDate(item.date)}</div>
            <div className="text-sm text-gray-400">
              Articles: {item.totalArticles} | Avg Sentiment: {item.averageSentiment?.toFixed(2)}
            </div>
          </div>
        );
      case 'alerts':
        return (
          <div className="space-y-2">
            <div className="font-medium text-white">{item.type}: {item.message}</div>
            <div className="text-sm text-gray-400">
              Created: {formatDate(item.createdAt)}
            </div>
          </div>
        );
      default:
        return (
          <div className="text-white">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-white">Database Manager</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowConfirm('all')}
            disabled={deleting}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Database Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Documents</p>
                <p className="text-2xl font-bold text-white">{stats.totalDocuments.toLocaleString()}</p>
              </div>
              <Server className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Articles</p>
                <p className="text-2xl font-bold text-white">{stats.collections.articles.count.toLocaleString()}</p>
                {stats.collections.articles.latest && (
                  <p className="text-xs text-gray-400 mt-1">
                    Latest: {formatDate(stats.collections.articles.latest.publishedAt)}
                  </p>
                )}
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Collections</p>
                <p className="text-2xl font-bold text-white">{Object.keys(stats.collections).length}</p>
              </div>
              <Database className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Collection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {collections.map((collection) => {
          const Icon = collection.icon;
          const count = stats?.collections[collection.key as keyof typeof stats.collections]?.count || 0;
          
          return (
            <button
              key={collection.key}
              onClick={() => setSelectedCollection(collection.key)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedCollection === collection.key
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-6 w-6 ${collection.color}`} />
                <div className="text-left">
                  <p className="font-medium text-white">{collection.name}</p>
                  <p className="text-sm text-gray-400">{count.toLocaleString()} items</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Collection Data */}
      {selectedCollection && collectionData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {collections.find(c => c.key === selectedCollection)?.name} Data
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">
                {collectionData.pagination.total} total items
              </span>
              <button
                onClick={() => setShowConfirm(selectedCollection)}
                disabled={deleting}
                className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Collection</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {collectionData.data.map((item, index) => (
              <div key={item._id || index} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {renderCollectionPreview(item, selectedCollection)}
                  </div>
                  <button
                    onClick={() => deleteItem(selectedCollection, item._id)}
                    disabled={deleting}
                    className="ml-4 p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {collectionData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => fetchCollectionData(selectedCollection, collectionData.pagination.page - 1)}
                disabled={collectionData.pagination.page === 1 || loading}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {collectionData.pagination.page} of {collectionData.pagination.totalPages}
              </span>
              <button
                onClick={() => fetchCollectionData(selectedCollection, collectionData.pagination.page + 1)}
                disabled={collectionData.pagination.page === collectionData.pagination.totalPages || loading}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-white">Confirm Deletion</h3>
            </div>
            
            <p className="text-gray-300 mb-6">
              {showConfirm === 'all' 
                ? 'Are you sure you want to delete ALL data from the database? This action cannot be undone.'
                : `Are you sure you want to delete all data from the ${showConfirm} collection? This action cannot be undone.`
              }
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirm('')}
                disabled={deleting}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => showConfirm === 'all' ? clearAllData() : deleteItem(showConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {deleting && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
