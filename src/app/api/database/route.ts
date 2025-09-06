import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/database';
import { Article, Analytics, Alert, KeywordTrack, RSSSource } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection');
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Get collection statistics
      const [
        articleCount,
        analyticsCount,
        alertCount,
        keywordTrackCount,
        rssSourceCount
      ] = await Promise.all([
        Article.countDocuments(),
        Analytics.countDocuments(),
        Alert.countDocuments(),
        KeywordTrack.countDocuments(),
        RSSSource.countDocuments()
      ]);

      // Get latest entries
      const [
        latestArticle,
        latestAnalytics,
        latestAlert
      ] = await Promise.all([
        Article.findOne().sort({ publishedAt: -1 }).select('title publishedAt source'),
        Analytics.findOne().sort({ date: -1 }).select('date totalArticles'),
        Alert.findOne().sort({ createdAt: -1 }).select('type message createdAt')
      ]);

      return NextResponse.json({
        collections: {
          articles: { count: articleCount, latest: latestArticle },
          analytics: { count: analyticsCount, latest: latestAnalytics },
          alerts: { count: alertCount, latest: latestAlert },
          keywordTracks: { count: keywordTrackCount },
          rssSources: { count: rssSourceCount }
        },
        totalDocuments: articleCount + analyticsCount + alertCount + keywordTrackCount + rssSourceCount
      });
    }

    if (!collection) {
      return NextResponse.json({ error: 'Collection parameter required' }, { status: 400 });
    }

    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    let data, total;

    switch (collection) {
      case 'articles':
        [data, total] = await Promise.all([
          Article.find()
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('title source publishedAt sentiment entities keywords url'),
          Article.countDocuments()
        ]);
        break;
      
      case 'analytics':
        [data, total] = await Promise.all([
          Analytics.find()
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit),
          Analytics.countDocuments()
        ]);
        break;
      
      case 'alerts':
        [data, total] = await Promise.all([
          Alert.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
          Alert.countDocuments()
        ]);
        break;
      
      case 'keywords':
        [data, total] = await Promise.all([
          KeywordTrack.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
          KeywordTrack.countDocuments()
        ]);
        break;
      
      case 'rss-sources':
        [data, total] = await Promise.all([
          RSSSource.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
          RSSSource.countDocuments()
        ]);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
    }

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Database API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection');
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'clear-all') {
      // Clear all collections
      await Promise.all([
        Article.deleteMany({}),
        Analytics.deleteMany({}),
        Alert.deleteMany({}),
        KeywordTrack.deleteMany({}),
        RSSSource.deleteMany({})
      ]);

      return NextResponse.json({ 
        message: 'All collections cleared successfully',
        cleared: ['articles', 'analytics', 'alerts', 'keywords', 'rss-sources']
      });
    }

    if (!collection) {
      return NextResponse.json({ error: 'Collection parameter required' }, { status: 400 });
    }

    let result;

    if (id) {
      // Delete specific document
      switch (collection) {
        case 'articles':
          result = await Article.findByIdAndDelete(id);
          break;
        case 'analytics':
          result = await Analytics.findByIdAndDelete(id);
          break;
        case 'alerts':
          result = await Alert.findByIdAndDelete(id);
          break;
        case 'keywords':
          result = await KeywordTrack.findByIdAndDelete(id);
          break;
        case 'rss-sources':
          result = await RSSSource.findByIdAndDelete(id);
          break;
        default:
          return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
      }

      if (!result) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        message: `Document deleted from ${collection}`,
        deletedId: id
      });
    } else {
      // Clear entire collection
      switch (collection) {
        case 'articles':
          result = await Article.deleteMany({});
          break;
        case 'analytics':
          result = await Analytics.deleteMany({});
          break;
        case 'alerts':
          result = await Alert.deleteMany({});
          break;
        case 'keywords':
          result = await KeywordTrack.deleteMany({});
          break;
        case 'rss-sources':
          result = await RSSSource.deleteMany({});
          break;
        default:
          return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
      }

      return NextResponse.json({ 
        message: `Collection ${collection} cleared`,
        deletedCount: result.deletedCount
      });
    }

  } catch (error) {
    console.error('Database delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    );
  }
}
