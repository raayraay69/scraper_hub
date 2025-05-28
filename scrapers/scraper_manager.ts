import { LillyScraper } from './lilly_scraper';
import { AnthemScraper } from './anthem_scraper';
import { RocheScraper } from './roche_scraper';
import { CortevaScraper } from './corteva_scraper';
import { CommunityHealthScraper } from './community_health_scraper';
import { CumminsScraper } from './cummins_scraper';
import { IUHealthScraper } from './iu_health_scraper';
import { RollsRoyceScraper } from './rolls_royce_scraper';
import { AngiScraper } from './angi_scraper';
import { FinishLineScraper } from './finish_line_scraper';
import { NoblesvilleGovEventsScraper } from './noblesville_gov_events_scraper';
import { NoblesvilleMainstreetEventsScraper } from './noblesville_mainstreet_events_scraper';
import { NoblesvilleParksCalendarScraper } from './noblesville_parks_calendar_scraper';
import { VisitHamiltonCountyEventsScraper } from './visit_hamilton_county_events_scraper';
import { EventbriteIndianaEventsScraper } from './eventbrite_indiana_events_scraper'; // Added import
import { JobListing, EventListing } from '@app-types'; // Consolidated imports
import { BaseScraper } from './base_scraper';

export class ScraperManager {
  private jobScrapers: BaseScraper[];
  private eventScrapers: BaseScraper[];

  constructor() {
    this.jobScrapers = [
      new LillyScraper(),
      new AnthemScraper(),
      new RocheScraper(),
      new CortevaScraper(),
      new CommunityHealthScraper(),
      new CumminsScraper(),
      new IUHealthScraper(),
      new RollsRoyceScraper(),
      new AngiScraper(),
      new FinishLineScraper()
    ];

    this.eventScrapers = [
      new NoblesvilleGovEventsScraper(),
      new NoblesvilleMainstreetEventsScraper(),
      new NoblesvilleParksCalendarScraper(),
      new VisitHamiltonCountyEventsScraper(),
      new EventbriteIndianaEventsScraper() // Added new scraper instance
    ];
  }

  /**
   * Run all job scrapers and return the combined results
   */
  public async runAllScrapers(env?: any): Promise<JobListing[]> {
    console.log('Starting job scraping process...');
    const allJobs: JobListing[] = [];

    for (const scraper of this.jobScrapers) {
      try {
        // Record the start of the scraper run
        const scraperName = scraper.constructor.name;
        const runId = env?.DB ? await this.recordScraperRunStart(scraperName, env) : null;

        console.log(`Running scraper: ${scraperName}`);
        const startTime = Date.now();
        const results = await scraper.scrape(); // results is JobListing[] | EventListing[]
        const duration = Date.now() - startTime;

        // Since this is from this.jobScrapers, we expect JobListing[]
        const jobs = results.filter((job): job is JobListing => 'company' in job);

        console.log(`Scraper ${scraperName} completed in ${duration}ms. Found ${jobs.length} jobs.`);
        allJobs.push(...jobs);

        // Record the success of the scraper run
        if (env?.DB && runId) {
          await this.recordScraperRunSuccess(runId, jobs.length, env);
        }
      } catch (error) {
        console.error(`Error running scraper for ${scraper.constructor.name}:`, error);

        // Record the failure of the scraper run
        if (env?.DB) {
          await this.recordScraperRunFailure(scraper.constructor.name, error, env);
        }
      }
    }

    console.log(`Scraping complete. Found ${allJobs.length} jobs total.`);
    return allJobs;
  }

  /**
   * Run a specific job scraper by name
   */
  public async runScraper(scraperName: string, env?: any): Promise<JobListing[]> {
    const scraper = this.jobScrapers.find(s =>
      s.constructor.name.toLowerCase() === scraperName.toLowerCase() ||
      s.constructor.name.toLowerCase().includes(scraperName.toLowerCase())
    );

    if (!scraper) {
      throw new Error(`Job scraper "${scraperName}" not found`);
    }

    try {
      // Record the start of the scraper run
      const actualScraperName = scraper.constructor.name;
      const runId = env?.DB ? await this.recordScraperRunStart(actualScraperName, env) : null;

      console.log(`Running job scraper for ${actualScraperName}...`);
      const startTime = Date.now();
      const results = await scraper.scrape(); // results is JobListing[] | EventListing[]
      const duration = Date.now() - startTime;
      
      // Since this is from this.jobScrapers, we expect JobListing[]
      const jobs = results.filter((job): job is JobListing => 'company' in job);

      console.log(`Scraper ${actualScraperName} completed in ${duration}ms. Found ${jobs.length} jobs.`);

      // Record the success of the scraper run
      if (env?.DB && runId) {
        await this.recordScraperRunSuccess(runId, jobs.length, env);
      }

      return jobs;
    } catch (error) {
      console.error(`Error running job scraper for ${scraper.constructor.name}:`, error);

      // Record the failure of the scraper run
      if (env?.DB) {
        await this.recordScraperRunFailure(scraper.constructor.name, error, env);
      }

      throw error;
    }
  }

  /**
   * Store jobs in the database
   */
  /**
   * Run all event scrapers and return the combined results
   */
  public async runAllEventScrapers(env?: any): Promise<EventListing[]> {
    console.log('Starting event scraping process...');
    const allEvents: EventListing[] = [];

    for (const scraper of this.eventScrapers) {
      try {
        // Record the start of the scraper run
        const scraperName = scraper.constructor.name;
        const runId = env?.DB ? await this.recordScraperRunStart(scraperName, env, 'event') : null;

        console.log(`Running event scraper: ${scraperName}`);
        const startTime = Date.now();
        const results = await scraper.scrape(); // results is JobListing[] | EventListing[]
        const duration = Date.now() - startTime;

        // Since this is from this.eventScrapers, we expect EventListing[]
        const events = results.filter((event): event is EventListing => 'start_date' in event);


        console.log(`Event scraper ${scraperName} completed in ${duration}ms. Found ${events.length} events.`);
        allEvents.push(...events);

        // Record the success of the scraper run
        if (env?.DB && runId) {
          await this.recordScraperRunSuccess(runId, events.length, env);
        }
      } catch (error) {
        console.error(`Error running event scraper for ${scraper.constructor.name}:`, error);

        // Record the failure of the scraper run
        if (env?.DB) {
          await this.recordScraperRunFailure(scraper.constructor.name, error, env, 'event');
        }
      }
    }

    console.log(`Event scraping complete. Found ${allEvents.length} events total.`);
    return allEvents;
  }

  /**
   * Run a specific event scraper by name
   */
  public async runEventScraper(scraperName: string, env?: any): Promise<EventListing[]> {
    const scraper = this.eventScrapers.find(s =>
      s.constructor.name.toLowerCase() === scraperName.toLowerCase() ||
      s.constructor.name.toLowerCase().includes(scraperName.toLowerCase())
    );

    if (!scraper) {
      throw new Error(`Event scraper "${scraperName}" not found`);
    }

    try {
      // Record the start of the scraper run
      const actualScraperName = scraper.constructor.name;
      const runId = env?.DB ? await this.recordScraperRunStart(actualScraperName, env, 'event') : null;

      console.log(`Running event scraper for ${actualScraperName}...`);
      const startTime = Date.now();
      const results = await scraper.scrape(); // results is JobListing[] | EventListing[]
      const duration = Date.now() - startTime;

      // Since this is from this.eventScrapers, we expect EventListing[]
      const events = results.filter((event): event is EventListing => 'start_date' in event);

      console.log(`Event scraper ${actualScraperName} completed in ${duration}ms. Found ${events.length} events.`);

      // Record the success of the scraper run
      if (env?.DB && runId) {
        await this.recordScraperRunSuccess(runId, events.length, env);
      }

      return events;
    } catch (error) {
      console.error(`Error running event scraper for ${scraper.constructor.name}:`, error);

      // Record the failure of the scraper run
      if (env?.DB) {
        await this.recordScraperRunFailure(scraper.constructor.name, error, env, 'event');
      }

      throw error;
    }
  }

  /**
   * Store events in the database
   */
  public async storeEvents(events: EventListing[], env: any): Promise<{ added: number; updated: number }> {
    if (!env?.DB) {
      throw new Error('Database connection not available');
    }

    console.log(`Storing ${events.length} events in the database...`);
    let addedCount = 0;
    let updatedCount = 0;

    for (const event of events) {
      try {
        // Check if event already exists by URL+title combination
        const existingEventQuery = `
          SELECT id FROM events
          WHERE (url = ? AND title = ?)
        `;
        const existingEventResult = await env.DB.prepare(existingEventQuery)
          .bind(event.url, event.title)
          .all();

        if (existingEventResult.results && existingEventResult.results.length > 0) {
          // Update existing event
          const updateQuery = `
            UPDATE events
            SET title = ?, description = ?, location = ?, venue = ?, address = ?,
                start_date = ?, end_date = ?, start_time = ?, end_time = ?,
                image_url = ?, category = ?, tags = ?, price = ?, is_free = ?,
                organizer = ?, source = ?, updated_at = ?
            WHERE id = ?
          `;

          await env.DB.prepare(updateQuery)
            .bind(
              event.title,
              event.description || '',
              event.location || '',
              event.venue || '',
              event.address || '',
              event.start_date || '',
              event.end_date || '',
              event.start_time || '',
              event.end_time || '',
              event.image_url || '',
              event.category || '',
              event.tags || '',
              event.price || '',
              event.is_free || 0,
              event.organizer || '',
              event.source || '',
              new Date().toISOString(),
              existingEventResult.results[0].id
            )
            .run();

          updatedCount++;
        } else {
          // Generate a unique ID for the event
          const id = `event_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

          // Insert new event
          const insertQuery = `
            INSERT INTO events (
              id, title, description, location, venue, address,
              start_date, end_date, start_time, end_time,
              image_url, category, tags, url, price, is_free,
              organizer, source, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          await env.DB.prepare(insertQuery)
            .bind(
              id,
              event.title,
              event.description || '',
              event.location || '',
              event.venue || '',
              event.address || '',
              event.start_date || '',
              event.end_date || '',
              event.start_time || '',
              event.end_time || '',
              event.image_url || '',
              event.category || '',
              event.tags || '',
              event.url || '',
              event.price || '',
              event.is_free || 0,
              event.organizer || '',
              event.source || '',
              new Date().toISOString(),
              new Date().toISOString()
            )
            .run();

          addedCount++;
        }
      } catch (error) {
        console.error(`Error storing event "${event.title}":`, error);
      }
    }

    console.log(`Successfully stored ${events.length} events (${addedCount} added, ${updatedCount} updated)`);
    return { added: addedCount, updated: updatedCount };
  }

  /**
   * Store jobs in the database
   */
  public async storeJobs(jobs: JobListing[], env: any): Promise<{ added: number; updated: number }> {
    if (!env?.DB) {
      throw new Error('Database connection not available');
    }

    console.log(`Storing ${jobs.length} jobs in the database...`);
    let addedCount = 0;
    let updatedCount = 0;

    for (const job of jobs) {
      try {
        // Check if job already exists by external_id or URL+company combination
        const existingJobQuery = `
          SELECT id FROM job_listings
          WHERE (external_id = ? AND company = ?) OR (url = ? AND company = ?)
        `;
        const existingJobResult = await env.DB.prepare(existingJobQuery)
          .bind(job.external_id, job.company, job.url, job.company)
          .all();

        if (existingJobResult.results && existingJobResult.results.length > 0) {
          // Update existing job
          const updateQuery = `
            UPDATE job_listings
            SET title = ?, description = ?, location = ?,
                salary = ?, job_type = ?, date_posted = ?, is_remote = ?,
                skills = ?, source = ?, status = ?, updated_at = ?
            WHERE id = ?
          `;

          await env.DB.prepare(updateQuery)
            .bind(
              job.title,
              job.description || '',
              job.location,
              job.salary || '',
              job.job_type || 'FULL_TIME',
              job.date_posted || new Date().toISOString(),
              job.is_remote ? 1 : 0,
              job.skills || '',
              job.source || '',
              job.status || 'active',
              new Date().toISOString(),
              existingJobResult.results[0].id
            )
            .run();

          updatedCount++;
        } else {
          // Insert new job
          const insertQuery = `
            INSERT INTO job_listings (
              title, company, description, location, url, salary, job_type,
              date_posted, external_id, is_remote, skills, source, status,
              created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          await env.DB.prepare(insertQuery)
            .bind(
              job.title,
              job.company,
              job.description || '',
              job.location,
              job.url,
              job.salary || '',
              job.job_type || 'FULL_TIME',
              job.date_posted || new Date().toISOString(),
              job.external_id || '',
              job.is_remote ? 1 : 0,
              job.skills || '',
              job.source || '',
              job.status || 'active',
              new Date().toISOString(),
              new Date().toISOString()
            )
            .run();

          addedCount++;
        }
      } catch (error) {
        console.error(`Error storing job "${job.title}":`, error);
      }
    }

    console.log(`Successfully stored ${jobs.length} jobs (${addedCount} added, ${updatedCount} updated)`);
    return { added: addedCount, updated: updatedCount };
  }

  /**
   * Record the start of a scraper run
   */
  private async recordScraperRunStart(scraperName: string, env: any, type: string = 'job'): Promise<number> {
    try {
      const query = `
        INSERT INTO scraper_runs (
          scraper_name, start_time, status, created_at
        )
        VALUES (?, ?, ?, ?)
      `;

      const result = await env.DB.prepare(query)
        .bind(
          scraperName,
          new Date().toISOString(),
          'running',
          new Date().toISOString()
        )
        .run();

      return result.meta?.last_row_id;
    } catch (error) {
      console.error(`Error recording scraper run start for ${scraperName}:`, error);
      return 0;
    }
  }

  /**
   * Record the success of a scraper run
   */
  private async recordScraperRunSuccess(runId: number, jobsFound: number, env: any): Promise<void> {
    try {
      const query = `
        UPDATE scraper_runs
        SET end_time = ?, status = ?, jobs_found = ?
        WHERE id = ?
      `;

      await env.DB.prepare(query)
        .bind(
          new Date().toISOString(),
          'success',
          jobsFound,
          runId
        )
        .run();
    } catch (error) {
      console.error(`Error recording scraper run success for run ${runId}:`, error);
    }
  }

  /**
   * Record the failure of a scraper run
   */
  private async recordScraperRunFailure(scraperName: string, error: any, env: any, type: string = 'job'): Promise<void> {
    try {
      // Check if there's an existing running record for this scraper
      const existingRunQuery = `
        SELECT id FROM scraper_runs
        WHERE scraper_name = ? AND status = 'running'
        ORDER BY start_time DESC
        LIMIT 1
      `;

      const existingRunResult = await env.DB.prepare(existingRunQuery)
        .bind(scraperName)
        .all();

      if (existingRunResult.results && existingRunResult.results.length > 0) {
        // Update the existing record
        const runId = existingRunResult.results[0].id;
        const updateQuery = `
          UPDATE scraper_runs
          SET end_time = ?, status = ?, error_message = ?
          WHERE id = ?
        `;

        await env.DB.prepare(updateQuery)
          .bind(
            new Date().toISOString(),
            'failed',
            error.message || 'Unknown error',
            runId
          )
          .run();
      } else {
        // Create a new record
        const insertQuery = `
          INSERT INTO scraper_runs (
            scraper_name, start_time, end_time, status, error_message, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const now = new Date().toISOString();
        await env.DB.prepare(insertQuery)
          .bind(
            scraperName,
            now,
            now,
            'failed',
            error.message || 'Unknown error',
            now
          )
          .run();
      }
    } catch (dbError) {
      console.error(`Error recording scraper run failure for ${scraperName}:`, dbError);
    }
  }
}
