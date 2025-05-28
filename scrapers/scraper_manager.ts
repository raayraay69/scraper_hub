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
import { JobListingSchema, EventListingSchema } from './schemas'; // Zod schemas
import { ScraperConfigOptions } from './config_types';

export class ScraperManager {
  private jobScrapers: BaseScraper[];
  private eventScrapers: BaseScraper[];

  constructor(env?: any) { // Allow env to be passed for potential config from there

    // Default global configuration for all scrapers
    const globalScraperConfig: ScraperConfigOptions = {
      rateLimitMinMs: env?.RATE_LIMIT_MIN_MS || 1200,
      rateLimitRandomMs: env?.RATE_LIMIT_RANDOM_MS || 600,
      maxItemsPerScraper: env?.MAX_ITEMS_PER_SCRAPER || 15,
    };

    // Specific configurations for each scraper
    const lillyConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://careers.lilly.com/api/jobs' };
    const anthemConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://careers.antheminc.com/api/jobs' }; // Assuming similar API structure
    const rocheConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://careers.roche.com/global/en/search-results' }; // Example, actual URL will vary
    const cortevaConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://careers.corteva.com/api/jobs' };
    const communityHealthConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://jobs.chs.net/api/jobs' };
    const cumminsConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://cummins.jobs/api/jobs' };
    const iuHealthConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://careers.iuhealth.org/api/jobs' }; // Example
    const rollsRoyceConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://careers.rolls-royce.com/api/jobs' };
    const angiConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://www.angi.com/careers/jobs' }; // Example, check actual job board
    const finishLineConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://careers.finishline.com/api/jobs' };
    
    const noblesvilleGovConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://www.noblesville.in.us/calendar.aspx' };
    const noblesvilleMainstreetConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://www.noblesvillemainstreet.org/events' };
    const noblesvilleParksConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://www.noblesvilleparks.org/calendar.aspx', maxItemsPerScraper: 10 };
    const visitHamiltonCountyConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://www.visithamiltoncounty.com/events/' };
    const eventbriteIndianaConfig: ScraperConfigOptions = { ...globalScraperConfig, baseUrl: 'https://www.eventbrite.com/d/united-states--indiana/all-events/', maxItemsPerScraper: 50 };


    this.jobScrapers = [
      new LillyScraper(lillyConfig),
      new AnthemScraper(anthemConfig),
      new RocheScraper(rocheConfig),
      new CortevaScraper(cortevaConfig),
      new CommunityHealthScraper(communityHealthConfig),
      new CumminsScraper(cumminsConfig),
      new IUHealthScraper(iuHealthConfig),
      new RollsRoyceScraper(rollsRoyceConfig),
      new AngiScraper(angiConfig),
      new FinishLineScraper(finishLineConfig)
    ];

    this.eventScrapers = [
      new NoblesvilleGovEventsScraper(noblesvilleGovConfig),
      new NoblesvilleMainstreetEventsScraper(noblesvilleMainstreetConfig),
      new NoblesvilleParksCalendarScraper(noblesvilleParksConfig),
      new VisitHamiltonCountyEventsScraper(visitHamiltonCountyConfig),
      new EventbriteIndianaEventsScraper(eventbriteIndianaConfig)
    ];
  }

  private isValidJobListing(item: any): item is JobListing {
    return item &&
           typeof item.title === 'string' && item.title.trim() !== '' &&
           typeof item.company === 'string' && item.company.trim() !== '' &&
           typeof item.url === 'string' && item.url.trim() !== '' &&
           typeof item.location === 'string' && 
           typeof item.description === 'string'; 
  }

  private isValidEventListing(item: any): item is EventListing {
    return item &&
           typeof item.title === 'string' && item.title.trim() !== '' &&
           typeof item.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.start_date) &&
           typeof item.url === 'string' && item.url.trim() !== '';
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
        const initialJobs = results.filter((job: any): job is JobListing => this.isValidJobListing(job));
        console.log(`Scraper ${scraperName} completed initial filter in ${duration}ms. Found ${initialJobs.length} potential jobs.`);

        const validatedJobs: JobListing[] = [];
        for (const job of initialJobs) {
          const parseResult = JobListingSchema.safeParse(job);
          if (parseResult.success) {
            validatedJobs.push(parseResult.data as JobListing);
          } else {
            console.warn(`[ScraperManager] Job validation failed for "${job.title}" from ${job.company}:`, parseResult.error.flatten().fieldErrors);
          }
        }
        console.log(`[ScraperManager] ${validatedJobs.length} jobs passed Zod validation for ${scraperName}.`);
        allJobs.push(...validatedJobs);

        // Record the success of the scraper run
        if (env?.DB && runId) {
          await this.recordScraperRunSuccess(runId, validatedJobs.length, env);
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
      const initialJobs = results.filter((job: any): job is JobListing => this.isValidJobListing(job));
      console.log(`Scraper ${actualScraperName} completed initial filter in ${duration}ms. Found ${initialJobs.length} potential jobs.`);
      
      const validatedJobs: JobListing[] = [];
      for (const job of initialJobs) {
        const parseResult = JobListingSchema.safeParse(job);
        if (parseResult.success) {
          validatedJobs.push(parseResult.data as JobListing);
        } else {
          console.warn(`[ScraperManager] Job validation failed for "${job.title}" from ${job.company}:`, parseResult.error.flatten().fieldErrors);
        }
      }
      console.log(`[ScraperManager] ${validatedJobs.length} jobs passed Zod validation for ${actualScraperName}.`);

      // Record the success of the scraper run
      if (env?.DB && runId) {
        await this.recordScraperRunSuccess(runId, validatedJobs.length, env);
      }

      return validatedJobs;
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
        const initialEvents = results.filter((event: any): event is EventListing => this.isValidEventListing(event));
        console.log(`Event scraper ${scraperName} completed initial filter in ${duration}ms. Found ${initialEvents.length} potential events.`);

        const validatedEvents: EventListing[] = [];
        for (const event of initialEvents) {
          const parseResult = EventListingSchema.safeParse(event);
          if (parseResult.success) {
            validatedEvents.push(parseResult.data as EventListing);
          } else {
            console.warn(`[ScraperManager] Event validation failed for "${event.title}":`, parseResult.error.flatten().fieldErrors);
          }
        }
        console.log(`[ScraperManager] ${validatedEvents.length} events passed Zod validation for ${scraperName}.`);
        allEvents.push(...validatedEvents);

        // Record the success of the scraper run
        if (env?.DB && runId) {
          await this.recordScraperRunSuccess(runId, validatedEvents.length, env);
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
      const initialEvents = results.filter((event: any): event is EventListing => this.isValidEventListing(event));
      console.log(`Event scraper ${actualScraperName} completed initial filter in ${duration}ms. Found ${initialEvents.length} potential events.`);

      const validatedEvents: EventListing[] = [];
      for (const event of initialEvents) {
        const parseResult = EventListingSchema.safeParse(event);
        if (parseResult.success) {
          validatedEvents.push(parseResult.data as EventListing);
        } else {
          console.warn(`[ScraperManager] Event validation failed for "${event.title}":`, parseResult.error.flatten().fieldErrors);
        }
      }
      console.log(`[ScraperManager] ${validatedEvents.length} events passed Zod validation for ${actualScraperName}.`);


      // Record the success of the scraper run
      if (env?.DB && runId) {
        await this.recordScraperRunSuccess(runId, validatedEvents.length, env);
      }

      return validatedEvents;
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
    // @ts-ignore D1PreparedStatement is available in CF Workers
    const insertStatements: D1PreparedStatement[] = [];
    // @ts-ignore D1PreparedStatement is available in CF Workers
    const updateStatements: D1PreparedStatement[] = [];

    for (const event of events) {
      if (!this.isValidEventListing(event)) {
        console.warn(`Skipping invalid event listing: ${event?.title || 'Untitled Event'}`);
        continue;
      }
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

          const updateStmt = env.DB.prepare(updateQuery)
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
            );
          updateStatements.push(updateStmt);
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

          const insertStmt = env.DB.prepare(insertQuery)
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
            );
          insertStatements.push(insertStmt);
          addedCount++;
        }
      } catch (error) {
        console.error(`Error preparing statement for event "${event.title}":`, error);
      }
    }

    const allEventStatements = [...insertStatements, ...updateStatements];
    if (allEventStatements.length > 0) {
      try {
        await env.DB.batch(allEventStatements);
        console.log(`Successfully batched ${insertStatements.length} inserts and ${updateStatements.length} updates for events.`);
      } catch (batchError) {
        console.error('Error executing batch event database operation:', batchError);
        // Potentially re-throw or handle so the overall process knows it failed
        throw batchError;
      }
    } else {
      console.log('No valid event statements to execute.');
    }
    
    console.log(`Processed ${events.length} events (intended: ${addedCount} added, ${updatedCount} updated)`);
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
    // @ts-ignore D1PreparedStatement is available in CF Workers
    const insertStatements: D1PreparedStatement[] = [];
    // @ts-ignore D1PreparedStatement is available in CF Workers
    const updateStatements: D1PreparedStatement[] = [];

    for (const job of jobs) {
      if (!this.isValidJobListing(job)) {
        console.warn(`Skipping invalid job listing: ${job?.title || 'Untitled Job'} at ${job?.company || 'Unknown Company'}`);
        continue;
      }
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

          const updateStmt = env.DB.prepare(updateQuery)
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
            );
          updateStatements.push(updateStmt);
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

          const insertStmt = env.DB.prepare(insertQuery)
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
            );
          insertStatements.push(insertStmt);
          addedCount++;
        }
      } catch (error) {
        console.error(`Error preparing statement for job "${job.title}" at "${job.company}":`, error);
      }
    }

    const allJobStatements = [...insertStatements, ...updateStatements];
    if (allJobStatements.length > 0) {
      try {
        await env.DB.batch(allJobStatements);
        console.log(`Successfully batched ${insertStatements.length} inserts and ${updateStatements.length} updates for jobs.`);
      } catch (batchError) {
        console.error('Error executing batch job database operation:', batchError);
        // Potentially re-throw or handle so the overall process knows it failed
        throw batchError;
      }
    } else {
      console.log('No valid job statements to execute.');
    }

    console.log(`Processed ${jobs.length} jobs (intended: ${addedCount} added, ${updatedCount} updated)`);
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
