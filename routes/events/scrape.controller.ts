import { IRequest } from 'itty-router';
import { ScraperManager } from '../../scrapers/scraper_manager';
import { authMiddleware } from '../../middleware/auth';

/**
 * Trigger event scraping for all sources
 */
export async function scrapeAllEvents(request: IRequest, env: any, context: any) {
  try {
    // Check if user is admin
    const { user } = context;
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized. Admin access required.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const scraperManager = new ScraperManager();
    const events = await scraperManager.runAllEventScrapers(env);
    const { added, updated } = await scraperManager.storeEvents(events, env);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Event scraping completed successfully. Found ${events.length} events, added ${added}, updated ${updated}.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error scraping events:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while scraping events'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Trigger event scraping for a specific source
 */
export async function scrapeSourceEvents(request: IRequest, env: any, context: any) {
  try {
    // Check if user is admin
    const { user } = context;
    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized. Admin access required.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { source } = context.params;
    
    if (!source) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Source name is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const scraperManager = new ScraperManager();
    const events = await scraperManager.runEventScraper(source, env);
    const { added, updated } = await scraperManager.storeEvents(events, env);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Event scraping for ${source} completed successfully. Found ${events.length} events, added ${added}, updated ${updated}.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error scraping source events:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while scraping source events'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
