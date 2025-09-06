import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { Article } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const source = searchParams.get('source');
    const keyword = searchParams.get('keyword');
    const sentiment = searchParams.get('sentiment');
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'publishedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: any = {};
    
    if (source) {
      query.source = { $regex: source, $options: 'i' };
    }
    
    if (keyword) {
      query.keywords = { $in: [new RegExp(keyword, 'i')] };
    }
    
    if (sentiment) {
      query['sentiment.label'] = sentiment;
    }
    
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [articles, totalCount] = await Promise.all([
      Article.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select({
          title: 1,
          description: 1,
          url: 1,
          source: 1,
          author: 1,
          publishedAt: 1,
          imageUrl: 1,
          category: 1,
          sentiment: 1,
          keywords: 1,
          entities: 1,
          metrics: 1,
          createdAt: 1
        }),
      Article.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { url, title, description, content, source } = body;

    if (!url || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: url, title, content' },
        { status: 400 }
      );
    }

    // Check if article already exists
    const existingArticle = await Article.findOne({ url });
    if (existingArticle) {
      return NextResponse.json(
        { error: 'Article already exists' },
        { status: 409 }
      );
    }

    // Create new article (this would normally trigger AI processing)
    const article = new Article({
      title,
      description: description || '',
      content,
      url,
      urlHash: require('crypto').createHash('sha256').update(url).digest('hex'),
      source: source || 'Manual',
      publishedAt: new Date(),
      sentiment: {
        score: 0,
        confidence: 0.5,
        label: 'neutral'
      },
      keywords: [],
      entities: {
        person: [],
        organization: [],
        location: [],
        technology: [],
        other: []
      },
      metrics: {
        readability: 50,
        wordCount: content.split(/\s+/).length
      }
    });

    await article.save();

    return NextResponse.json(article, { status: 201 });

  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
