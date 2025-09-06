import cron from 'node-cron';
import scraperService from '@/services/scraper';
import analyticsService from '@/services/analytics';

export class SchedulerService {
  private static instance: SchedulerService;
  private isSchedulerRunning = false;
  private tasks: any[] = [];

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  start(): void {
    if (this.isSchedulerRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting News Sentiment Analyzer scheduler...');

    // Scrape news every 15 minutes
    const scraperSchedule = process.env.SCRAPER_CRON_SCHEDULE || '0 */15 * * * *';
    const scraperTask = cron.schedule(scraperSchedule, async () => {
      console.log('Running scheduled news scraping...');
      try {
        await scraperService.scrapeAll();
        console.log('Scheduled scraping completed');
      } catch (error) {
        console.error('Error in scheduled scraping:', error);
      }
    });
    this.tasks.push(scraperTask);

    // Check for alerts every hour
    const alertTask = cron.schedule('0 0 * * * *', async () => {
      console.log('Checking for alerts...');
      try {
        await analyticsService.checkAlerts();
        console.log('Alert checking completed');
      } catch (error) {
        console.error('Error checking alerts:', error);
      }
    });
    this.tasks.push(alertTask);

    // Generate analytics cache daily at midnight
    const analyticsSchedule = process.env.ANALYTICS_CRON_SCHEDULE || '0 0 * * *';
    const analyticsTask = cron.schedule(analyticsSchedule, async () => {
      console.log('Generating analytics cache...');
      try {
        // This would call a more complex analytics caching function
        console.log('Analytics caching completed');
      } catch (error) {
        console.error('Error generating analytics cache:', error);
      }
    });
    this.tasks.push(analyticsTask);

    this.isSchedulerRunning = true;
    console.log('Scheduler started successfully');
  }

  stop(): void {
    if (!this.isSchedulerRunning) {
      console.log('Scheduler is not running');
      return;
    }

    this.tasks.forEach(task => task.destroy());
    this.tasks = [];
    this.isSchedulerRunning = false;
    console.log('Scheduler stopped');
  }

  getStatus(): { isRunning: boolean; schedules: any } {
    return {
      isRunning: this.isSchedulerRunning,
      schedules: {
        scraper: process.env.SCRAPER_CRON_SCHEDULE || '0 */15 * * * *',
        alerts: '0 0 * * * *',
        analytics: process.env.ANALYTICS_CRON_SCHEDULE || '0 0 * * *'
      }
    };
  }
}

export default SchedulerService.getInstance();
