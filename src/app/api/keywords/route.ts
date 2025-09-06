import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { KeywordTrack } from '@/models';
import analyticsService from '@/services/analytics';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    if (keyword) {
      // Get metrics for specific keyword
      const metrics = await analyticsService.getKeywordMetrics(keyword);
      return NextResponse.json(metrics);
    } else {
      // Get all tracked keywords
      const keywords = await KeywordTrack.find().sort({ createdAt: -1 });
      return NextResponse.json(keywords);
    }

  } catch (error) {
    console.error('Error fetching keywords:', error);
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
    const { keyword, category, alertThreshold } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }

    // Check if keyword already exists
    const existingKeyword = await KeywordTrack.findOne({ keyword });
    if (existingKeyword) {
      return NextResponse.json(
        { error: 'Keyword already being tracked' },
        { status: 409 }
      );
    }

    const keywordTrack = new KeywordTrack({
      keyword,
      category: category || 'custom',
      isActive: true,
      alertThreshold: alertThreshold || {
        sentimentChange: 20,
        volumeSpike: 50
      }
    });

    await keywordTrack.save();

    return NextResponse.json(keywordTrack, { status: 201 });

  } catch (error) {
    console.error('Error creating keyword track:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const result = await KeywordTrack.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json(
        { error: 'Keyword not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Keyword track deleted successfully' });

  } catch (error) {
    console.error('Error deleting keyword track:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
