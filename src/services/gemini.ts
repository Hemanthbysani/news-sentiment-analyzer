import OpenAI from 'openai';

export interface SentimentAnalysis {
  score: number; // -1 to 1 (negative to positive)
  confidence: number; // 0 to 1
  label: 'positive' | 'negative' | 'neutral';
  emotions?: {
    joy?: number;
    anger?: number;
    fear?: number;
    sadness?: number;
    surprise?: number;
    disgust?: number;
  };
}

export interface EntityExtraction {
  person: string[];
  organization: string[];
  location: string[];
  technology: string[];
  other: string[];
}

export interface KeywordExtraction {
  keywords: string[];
  topics: string[];
}

class OpenRouterService {
  private openRouterClient: OpenAI;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;

  constructor() {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    this.openRouterClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
    });
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Implement basic rate limiting - wait 100ms between requests
    if (timeSinceLastRequest < 100) {
      const waitTime = 100 - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = now;
  }

  private async callOpenRouter(prompt: string, type: 'sentiment' | 'entities' | 'keywords' | 'readability'): Promise<any> {
    await this.rateLimit();

    const completion = await this.openRouterClient.chat.completions.create({
      model: "moonshotai/kimi-k2:free",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const responseText = completion.choices[0].message.content || '';
    
    // Extract JSON from markdown code blocks if present
    let jsonContent = responseText.trim();
    
    // First try to extract from markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
    const codeBlockMatch = jsonContent.match(codeBlockRegex);
    
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
    } else {
      // Try to find JSON object directly in the response
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonContent.match(jsonRegex);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
    }
    
    // Parse JSON response based on type
    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error parsing OpenRouter response:', error);
      console.error('Raw response:', responseText);
      console.error('Extracted JSON content:', jsonContent);
      // Return fallback based on type
      switch (type) {
        case 'sentiment':
          return { score: 0, confidence: 0.1, label: 'neutral' };
        case 'entities':
          return { person: [], organization: [], location: [], technology: [], other: [] };
        case 'keywords':
          return { keywords: [], topics: [] };
        case 'readability':
          return 50;
        default:
          return {};
      }
    }
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    try {
      const prompt = `
        Analyze the sentiment of the following news article text. Provide a detailed analysis including:
        1. Overall sentiment score from -1 (very negative) to 1 (very positive)
        2. Confidence level from 0 to 1
        3. Sentiment label (positive, negative, or neutral)
        4. Emotional analysis with scores from 0 to 1 for: joy, anger, fear, sadness, surprise, disgust

        Return ONLY a valid JSON object in the following format (no markdown, no code blocks):
        {
          "score": <number between -1 and 1>,
          "confidence": <number between 0 and 1>,
          "label": "<positive|negative|neutral>",
          "emotions": {
            "joy": <number between 0 and 1>,
            "anger": <number between 0 and 1>,
            "fear": <number between 0 and 1>,
            "sadness": <number between 0 and 1>,
            "surprise": <number between 0 and 1>,
            "disgust": <number between 0 and 1>
          }
        }

        Text to analyze:
        "${text.replace(/"/g, '\\"')}"
      `;

      const result = await this.callOpenRouter(prompt, 'sentiment');
      
      // Validate and normalize the response
      return {
        score: Math.max(-1, Math.min(1, result.score || 0)),
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        label: this.normalizeSentimentLabel(result.label),
        emotions: result.emotions ? {
          joy: Math.max(0, Math.min(1, result.emotions.joy || 0)),
          anger: Math.max(0, Math.min(1, result.emotions.anger || 0)),
          fear: Math.max(0, Math.min(1, result.emotions.fear || 0)),
          sadness: Math.max(0, Math.min(1, result.emotions.sadness || 0)),
          surprise: Math.max(0, Math.min(1, result.emotions.surprise || 0)),
          disgust: Math.max(0, Math.min(1, result.emotions.disgust || 0))
        } : undefined
      };
    } catch (error) {
      console.error('Error analyzing sentiment with OpenRouter:', error);
      
      // Return fallback neutral sentiment
      return {
        score: 0,
        confidence: 0.1,
        label: 'neutral'
      };
    }
  }

  async extractEntities(text: string): Promise<EntityExtraction> {
    try {
      const prompt = `
        Extract named entities from the following news article text. Categorize them into:
        1. person - Names of people
        2. organization - Companies, institutions, organizations
        3. location - Places, countries, cities
        4. technology - Technologies, products, software, hardware
        5. other - Other significant entities

        Return ONLY a valid JSON object in the following format (no markdown, no code blocks):
        {
          "person": ["name1", "name2"],
          "organization": ["org1", "org2"],
          "location": ["location1", "location2"],
          "technology": ["tech1", "tech2"],
          "other": ["other1", "other2"]
        }

        Text to analyze:
        "${text.replace(/"/g, '\\"')}"
      `;

      const result = await this.callOpenRouter(prompt, 'entities');
      
      return {
        person: Array.isArray(result.person) ? result.person : [],
        organization: Array.isArray(result.organization) ? result.organization : [],
        location: Array.isArray(result.location) ? result.location : [],
        technology: Array.isArray(result.technology) ? result.technology : [],
        other: Array.isArray(result.other) ? result.other : []
      };
    } catch (error) {
      console.error('Error extracting entities with OpenRouter:', error);
      
      return {
        person: [],
        organization: [],
        location: [],
        technology: [],
        other: []
      };
    }
  }

  async extractKeywords(text: string): Promise<KeywordExtraction> {
    try {
      const prompt = `
        Extract the most important keywords and topics from the following news article text.
        Provide:
        1. keywords - Specific important terms, phrases, and concepts
        2. topics - Broader themes and subjects covered

        Return ONLY a valid JSON object in the following format (no markdown, no code blocks):
        {
          "keywords": ["keyword1", "keyword2", "keyword3"],
          "topics": ["topic1", "topic2", "topic3"]
        }

        Limit to the top 10 keywords and top 5 topics.

        Text to analyze:
        "${text.replace(/"/g, '\\"')}"
      `;

      const result = await this.callOpenRouter(prompt, 'keywords');
      
      return {
        keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 10) : [],
        topics: Array.isArray(result.topics) ? result.topics.slice(0, 5) : []
      };
    } catch (error) {
      console.error('Error extracting keywords with OpenRouter:', error);
      
      return {
        keywords: [],
        topics: []
      };
    }
  }

  async translateText(text: string, targetLanguage: string = 'en'): Promise<string> {
    try {
      const prompt = `
        Translate the following text to ${targetLanguage}. 
        Only return the translated text, nothing else.

        Text to translate:
        "${text.replace(/"/g, '\\"')}"
      `;

      await this.rateLimit();
      const completion = await this.openRouterClient.chat.completions.create({
        model: "moonshotai/kimi-k2:free",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }, {
        headers: {
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_SITE_NAME || "News Sentiment Analyzer",
        }
      });

      return completion.choices[0].message.content?.trim() || text;
    } catch (error) {
      console.error('Error translating text with OpenRouter:', error);
      return text; // Return original text if translation fails
    }
  }

  async calculateReadability(text: string): Promise<number> {
    try {
      const prompt = `
        Calculate the readability score of the following text on a scale from 0 to 100, 
        where 100 is very easy to read and 0 is very difficult to read.
        Consider factors like sentence length, word complexity, and overall structure.
        
        Return ONLY a number between 0 and 100 (no text, no explanation, just the number).

        Text to analyze:
        "${text.replace(/"/g, '\\"')}"
      `;

      const result = await this.callOpenRouter(prompt, 'readability');
      
      // Handle both number and string responses
      let score;
      if (typeof result === 'number') {
        score = result;
      } else if (typeof result === 'string') {
        score = parseFloat(result);
      } else if (result && typeof result.score === 'number') {
        score = result.score;
      } else {
        score = 50; // Default fallback
      }
      
      return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Error calculating readability with OpenRouter:', error);
      
      return 50; // Default readability score
    }
  }

  private normalizeSentimentLabel(label: string): 'positive' | 'negative' | 'neutral' {
    const normalizedLabel = label?.toLowerCase();
    if (normalizedLabel?.includes('positive')) return 'positive';
    if (normalizedLabel?.includes('negative')) return 'negative';
    return 'neutral';
  }
}

export default new OpenRouterService();
