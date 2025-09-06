// MongoDB initialization script
db = db.getSiblingDB('news-sentiment-analyzer');

// Create collections with indexes
db.createCollection('articles');
db.articles.createIndex({ "url": 1 }, { unique: true });
db.articles.createIndex({ "publishedAt": -1 });
db.articles.createIndex({ "source": 1 });
db.articles.createIndex({ "keywords": 1 });
db.articles.createIndex({ "sentiment.label": 1 });
db.articles.createIndex({ "sentiment.score": 1 });

db.createCollection('keywords');
db.keywords.createIndex({ "keyword": 1 }, { unique: true });
db.keywords.createIndex({ "isActive": 1 });

db.createCollection('analytics');
db.analytics.createIndex({ "date": -1 });
db.analytics.createIndex({ "type": 1 });

db.createCollection('alerts');
db.alerts.createIndex({ "createdAt": -1 });
db.alerts.createIndex({ "isRead": 1 });
db.alerts.createIndex({ "keyword": 1 });

db.createCollection('rsssources');
db.rsssources.createIndex({ "url": 1 }, { unique: true });
db.rsssources.createIndex({ "isActive": 1 });

print('Database initialized successfully!');
