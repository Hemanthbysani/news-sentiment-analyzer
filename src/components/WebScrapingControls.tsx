import React, { useState } from 'react';

interface WebScrapingControlsProps {
  onScrapeComplete: () => void;
}

const WebScrapingControls: React.FC<WebScrapingControlsProps> = ({ onScrapeComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState('all');
  const [lastResult, setLastResult] = useState<string>('');

  const sources = [
    { value: 'all', label: 'All Sources' },
    { value: 'BBC News', label: 'BBC News' },
    { value: 'Reuters', label: 'Reuters' },
    { value: 'CNN', label: 'CNN' },
    { value: 'The Guardian', label: 'The Guardian' }
  ];

  const handleWebScraping = async () => {
    setIsLoading(true);
    setLastResult('');

    try {
      const payload = {
        method: 'web',
        ...(selectedSource !== 'all' && { source: selectedSource }),
        saveToDB: true,
        analyzeSentiment: true
      };

      const response = await fetch('/api/web-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setLastResult(`✅ Success: Scraped ${data.data.totalScraped} articles, saved ${data.data.savedToDatabase} to database`);
        onScrapeComplete();
      } else {
        setLastResult(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Web scraping error:', error);
      setLastResult('❌ Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRSSFallback = async () => {
    setIsLoading(true);
    setLastResult('');

    try {
      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method: 'rss' }),
      });

      const data = await response.json();
      setLastResult(`✅ RSS Success: Processed ${data.articleCount} articles`);
      onScrapeComplete();
    } catch (error) {
      console.error('RSS scraping error:', error);
      setLastResult('❌ RSS scraping failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Web Scraping Controls</h3>
      
      <div className="space-y-4">
        {/* Source Selection */}
        <div>
          <label htmlFor="source-select" className="block text-sm font-medium text-gray-700 mb-2">
            Choose News Source
          </label>
          <select
            id="source-select"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            {sources.map(source => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleWebScraping}
            disabled={isLoading}
            className="flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? '⏳ Scraping...' : '🌐 Start Web Scraping'}
          </button>
          
          <button
            onClick={handleRSSFallback}
            disabled={isLoading}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? '⏳ Processing...' : '📡 RSS Fallback'}
          </button>
        </div>

        {/* Status Display */}
        {lastResult && (
          <div className={`p-3 rounded-md text-sm ${
            lastResult.includes('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {lastResult}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
          <p><strong>Web Scraping:</strong> Directly visits news websites and extracts articles (slower but comprehensive)</p>
          <p><strong>RSS Fallback:</strong> Uses RSS feeds for faster but limited article collection</p>
        </div>
      </div>
    </div>
  );
};

export default WebScrapingControls;
