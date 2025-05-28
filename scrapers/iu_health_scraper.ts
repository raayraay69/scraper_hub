import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
// import axios from 'axios'; // Temporarily disabled
// import * as xml2js from 'xml2js'; // Temporarily disabled

export class IUHealthScraper extends BaseScraper {
  constructor() {
    super('Indiana University Health', 'https://careers.iuhealth.org/');
  }

  public async scrape(): Promise<JobListing[]> {
    // Temporarily disabled for testing backend deployment issues
    console.log('IUHealthScraper.scrape() called, but xml2js/axios usage is temporarily disabled.');
    return Promise.resolve([]);
    /*
    try {
      // Try RSS feed
      const rssUrl = 'https://careers.iuhealth.org/rss';
      console.log(`Attempting to fetch RSS feed from ${rssUrl}`);
      
:start_line:21
-------
      try {
        const response = await fetch(rssUrl, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (response.status === 200) {
          const parser = new xml2js.Parser({ explicitArray: false });
          const result = await parser.parseStringPromise(response.data);
          
          const items = result.rss.channel.item;
          const jobs: JobListing[] = [];
          
          if (Array.isArray(items)) {
            for (const item of items) {
              jobs.push({
                title: item.title,
                company: this.companyName,
                description: item.description || '',
                location: 'Indianapolis, IN',
                url: item.link,
                date_posted: item.pubDate,
                external_id: item.guid || item.link,
                source: this.baseUrl
              });
            }
          } else if (items) {
            // Handle case where there's only one item
            jobs.push({
              title: items.title,
              company: this.companyName,
              description: items.description || '',
              location: 'Indianapolis, IN',
              url: items.link,
              date_posted: items.pubDate,
              external_id: items.guid || items.link,
              source: this.baseUrl
            });
          }
          
          console.log(`Found ${jobs.length} jobs via RSS feed`);
          return jobs;
        }
      } catch (rssError: unknown) {
        if (rssError instanceof Error) {
          console.log('RSS feed not available or error:', rssError.message);
        } else {
          console.log('RSS feed not available or unknown error:', rssError);
        }
      }
      
      // Fallback to HTML scraping
      console.log(`Scraping jobs from ${this.baseUrl}`);
      const html = await this.fetchHtml(this.baseUrl);
      
      // Try JSON-LD first
      const jsonLdJobs = this.extractJsonLd(html);
      
      if (jsonLdJobs.length > 0) {
        console.log(`Found ${jsonLdJobs.length} jobs via JSON-LD`);
        return jsonLdJobs.map(job => this.normalizeJob(job));
      }
      
      // If we get here, we couldn't find jobs via RSS or JSON-LD
      console.log('Could not find jobs via RSS or JSON-LD');
      return [];
    } catch (error) {
      console.error('Error scraping IU Health jobs:', error);
      return [];
    }
    */
  }
}
