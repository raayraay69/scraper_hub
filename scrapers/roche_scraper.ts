import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
import { parseHTML } from 'linkedom'; // Import linkedom instead of cheerio

export class RocheScraper extends BaseScraper {
  constructor() {
    super('Roche Diagnostics', 'https://careers.roche.com/global/en/indianapolis-indiana');
  }

  public async scrape(): Promise<JobListing[]> {
    // Temporarily disabled for testing backend deployment issues
    // console.log('RocheScraper.scrape() called, but cheerio usage is temporarily disabled.');
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
      
      // Roche typically uses a job listing component with specific classes
      document.querySelectorAll('.job-card, .job-listing, .job-item').forEach((element: Element) => {
        const titleElement = element.querySelector('.job-title, .title, h3');
        const title = titleElement?.textContent?.trim() || '';
        
        const urlElement = element.querySelector('a');
        const url = urlElement?.getAttribute('href') || '';
        
        const locationElement = element.querySelector('.location, .job-location');
        const location = locationElement?.textContent?.trim() || 'Indianapolis, IN';
        
        if (title && url) {
          const descriptionElement = element.querySelector('.job-description, .description');
          const description = descriptionElement?.textContent?.trim() || '';

          jobs.push({
            title,
            company: this.companyName,
            description,
            location,
            url: url.startsWith('http') ? url : `https://careers.roche.com${url}`,
            source: this.baseUrl,
            external_id: url
          });
        }
      });
      
      console.log(`Found ${jobs.length} jobs via HTML parsing`);
      return jobs;
    } catch (error) {
      console.error('Error scraping Roche jobs:', error);
      return [];
    }
  }
}
