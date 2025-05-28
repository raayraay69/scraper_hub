import { IRequest } from 'itty-router';
import { ScraperManager } from '../../scrapers/scraper_manager';
import { authMiddleware } from '../../middleware/auth';

/**
 * Trigger job scraping for all companies
 */
export async function scrapeAllJobs(request: IRequest, env: any, context: any) {
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
    const jobs = await scraperManager.runAllScrapers(env);
    const { added, updated } = await scraperManager.storeJobs(jobs, env);

    return new Response(JSON.stringify({
      success: true,
      message: `Job scraping completed successfully. Found ${jobs.length} jobs, added ${added}, updated ${updated}.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error scraping jobs:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while scraping jobs'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Trigger job scraping for a specific company
 */
export async function scrapeCompanyJobs(request: IRequest, env: any, context: any) {
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

    const { company } = context.params;

    if (!company) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Company name is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const scraperManager = new ScraperManager();
    const jobs = await scraperManager.runScraper(company, env);
    const { added, updated } = await scraperManager.storeJobs(jobs, env);

    return new Response(JSON.stringify({
      success: true,
      message: `Job scraping for ${company} completed successfully. Found ${jobs.length} jobs, added ${added}, updated ${updated}.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error scraping company jobs:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while scraping company jobs'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
