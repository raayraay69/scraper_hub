import { ScraperManager } from '../scrapers/scraper_manager';

export async function scheduledJobScraping(env: any, ctx: any) {
  console.log('Starting scheduled job scraping...');

  try {
    const scraperManager = new ScraperManager();
    const jobs = await scraperManager.runAllScrapers(env);
    const { added, updated } = await scraperManager.storeJobs(jobs, env);

    console.log(`Scheduled job scraping completed. Found ${jobs.length} jobs, added ${added}, updated ${updated}.`);
  } catch (error) {
    console.error('Error in scheduled job scraping:', error);
  }
}
