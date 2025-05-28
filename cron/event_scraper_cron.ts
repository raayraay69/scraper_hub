import { ScraperManager } from '../scrapers/scraper_manager';

export async function scheduledEventScraping(env: any, ctx: any) {
  console.log('Starting scheduled event scraping...');
  
  try {
    const scraperManager = new ScraperManager();
    const events = await scraperManager.runAllEventScrapers(env);
    const { added, updated } = await scraperManager.storeEvents(events, env);
    
    console.log(`Scheduled event scraping completed. Found ${events.length} events, added ${added}, updated ${updated}.`);
  } catch (error) {
    console.error('Error in scheduled event scraping:', error);
  }
}
