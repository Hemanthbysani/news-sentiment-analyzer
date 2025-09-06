import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { RSSSource } from '@/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sources = await RSSSource.find().sort({ createdAt: -1 });

    return NextResponse.json(sources);

  } catch (error) {
    console.error('Error fetching RSS sources:', error);
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
    const { name, url, category, settings } = body;

    if (!name || !url || !category) {
      return NextResponse.json(
        { error: 'Name, URL, and category are required' },
        { status: 400 }
      );
    }

    // Check if URL already exists
    const existingSource = await RSSSource.findOne({ url });
    if (existingSource) {
      return NextResponse.json(
        { error: 'RSS source with this URL already exists' },
        { status: 409 }
      );
    }

    const rssSource = new RSSSource({
      name,
      url,
      category,
      isActive: true,
      errorCount: 0,
      settings: settings || {
        fetchInterval: 15,
        maxArticles: 50
      }
    });

    await rssSource.save();

    return NextResponse.json(rssSource, { status: 201 });

  } catch (error) {
    console.error('Error creating RSS source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { id, name, url, category, isActive, settings } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (url) updateData.url = url;
    if (category) updateData.category = category;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (settings) updateData.settings = settings;

    const rssSource = await RSSSource.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!rssSource) {
      return NextResponse.json(
        { error: 'RSS source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rssSource);

  } catch (error) {
    console.error('Error updating RSS source:', error);
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

    const result = await RSSSource.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json(
        { error: 'RSS source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'RSS source deleted successfully' });

  } catch (error) {
    console.error('Error deleting RSS source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
