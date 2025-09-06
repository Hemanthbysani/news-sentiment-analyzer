import { NextRequest, NextResponse } from 'next/server';
import WebScraper from '@/services/webScraper';
import connectToDatabase from '@/lib/database';
import { Article } from '@/models';
import callOpenRouter from '@/services/gemini';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const action = searchParams.get('action') || 'scrape';

    const scraper = new WebScraper();

    if (action === 'sources') {
      return NextResponse.json({
        status: 'success',
        sources: scraper.getAvailableSources(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'scrape') {
      let scrapedArticles;
      
      if (source) {
        scrapedArticles = await scraper.scrapeSource(source);
      } else {
        scrapedArticles = await scraper.scrapeAllSources();
      }

      return NextResponse.json({
        status: 'success',
        message: `Scraped ${scrapedArticles.length} articles`,
        data: scrapedArticles,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Invalid action. Use ?action=sources or ?action=scrape'
    }, { status: 400 });

  } catch (error) {
    console.error('Web scraper API error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, saveToDB = false, analyzeSentiment = false } = body;

    console.log('Starting web scraping with options:', { source, saveToDB, analyzeSentiment });

    const scraper = new WebScraper();
    let scrapedArticles;
    
    if (source) {
      scrapedArticles = await scraper.scrapeSource(source);
    } else {
      scrapedArticles = await scraper.scrapeAllSources();
    }

    console.log(`Scraped ${scrapedArticles.length} articles`);

    let savedCount = 0;
    let analyzedCount = 0;

    if (saveToDB || analyzeSentiment) {
      await connectToDatabase();

      for (const scrapedArticle of scrapedArticles) {
        try {
          let sentimentData = null;

          // Analyze sentiment if requested
          if (analyzeSentiment) {
            console.log(`Analyzing sentiment for: ${scrapedArticle.title.substring(0, 50)}...`);
            
            const sentimentResult = await callOpenRouter.analyzeSentiment(scrapedArticle.content);
            const entitiesResult = await callOpenRouter.extractEntities(scrapedArticle.content);
            const keywordsResult = await callOpenRouter.extractKeywords(scrapedArticle.content);
            
            sentimentData = {
              sentiment: sentimentResult.label,
              sentiment_score: sentimentResult.score,
              confidence: sentimentResult.confidence,
              keywords: keywordsResult.keywords,
              entities: {
                organization: entitiesResult.organization,
                person: entitiesResult.person,
                technology: entitiesResult.technology
              },
              category: 'other', // Default category
              summary: scrapedArticle.title // Use title as summary fallback
            };
            
            analyzedCount++;
          }

          // Save to database if requested
          if (saveToDB) {
            const articleData = {
              title: scrapedArticle.title,
              content: scrapedArticle.content,
              url: scrapedArticle.url,
              publishedAt: scrapedArticle.publishedAt,
              source: scrapedArticle.source,
              author: scrapedArticle.author,
              imageUrl: scrapedArticle.imageUrl,
              scrapedAt: new Date(),
              ...(sentimentData && {
                sentiment: sentimentData.sentiment || 'neutral',
                sentimentScore: sentimentData.sentiment_score || 0,
                confidence: sentimentData.confidence || 0,
                keywords: sentimentData.keywords || [],
                entities: sentimentData.entities || {},
                category: sentimentData.category || 'other',
                summary: sentimentData.summary || ''
              })
            };

            // Check if article already exists
            const existingArticle = await Article.findOne({ url: scrapedArticle.url });
            
            if (!existingArticle) {
              await Article.create(articleData);
              savedCount++;
              console.log(`✓ Saved: ${scrapedArticle.title.substring(0, 50)}...`);
            } else {
              console.log(`• Skipped (exists): ${scrapedArticle.title.substring(0, 50)}...`);
            }
          }

          // Add small delay between processing articles
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (articleError) {
          console.error(`Error processing article "${scrapedArticle.title}":`, articleError);
          continue;
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      message: `Web scraping completed successfully`,
      data: {
        totalScraped: scrapedArticles.length,
        savedToDatabase: savedCount,
        analyzedSentiment: analyzedCount,
        articles: saveToDB ? undefined : scrapedArticles
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Web scraper POST API error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
