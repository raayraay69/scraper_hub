import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
import { parseHTML } from 'linkedom'; // Import linkedom instead of cheerio

export class LillyScraper extends BaseScraper {
  constructor() {
    super('Eli Lilly & Co.', 'https://jobsearch.lilly.com/locations/indianapolis-in/jobs/');
  }

  public async scrape(): Promise<JobListing[]> {
    // Temporarily disabled for testing backend deployment issues
    // console.log('LillyScraper.scrape() called, but cheerio usage is temporarily disabled.');
    // return Promise.resolve([]);
    
    try {
      console.log(`Scraping jobs from ${this.baseUrl}`);
      const html = await this.fetchHtml(this.baseUrl);
      
      // Try JSON-LD first
      const jsonLdJobs = this.extractJsonLd(html);
      
      if (jsonLdJobs.length > 0) {
        console.log(`Found ${jsonLdJobs.length} jobs via JSON-LD`);
        return jsonLdJobs.map(job => this.normalizeJob(job));
      }
      
      // Fallback to HTML parsing
      console.log('No JSON-LD found, falling back to HTML parsing');
      const { document } = parseHTML(html);
      const jobs: JobListing[] = [];
      
      document.querySelectorAll('.job-card').forEach((element: Element) => {
        const titleElement = element.querySelector('.job-title');
        const title = titleElement?.textContent?.trim() || '';
        
        const urlElement = element.querySelector('a');
        const url = urlElement?.getAttribute('href') || '';
        
        const datePostedElement = element.querySelector('.posted-date');
        const datePosted = datePostedElement?.textContent?.trim() || '';
        
        jobs.push({
          title,
          company: this.companyName,
          description: '',  // Would need to fetch individual job pages for full description
          location: 'Indianapolis, IN',
          url: url.startsWith('http') ? url : `https://jobsearch.lilly.com${url}`,
          date_posted: datePosted,
          external_id: url,
          source: this.baseUrl
        });
      });
      
      console.log(`Found ${jobs.length} jobs via HTML parsing`);
      return jobs;
    } catch (error) {
      console.error('Error scraping Lilly jobs:', error);
      return [];
    }
  }
}
