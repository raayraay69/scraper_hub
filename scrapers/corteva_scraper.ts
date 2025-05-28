import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
import { parseHTML } from 'linkedom'; // Import linkedom instead of cheerio

export class CortevaScraper extends BaseScraper {
  constructor() {
    super('Corteva Agriscience', 'https://corteva.dejobs.org/locations/indianapolis-in/jobs/');
  }

  public async scrape(): Promise<JobListing[]> {
    // Temporarily disabled for testing backend deployment issues
    // console.log('CortevaScraper.scrape() called, but cheerio usage is temporarily disabled.');
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
      
      document.querySelectorAll('.job-row').forEach((element: Element) => {
        const titleElement = element.querySelector('a');
        const title = titleElement?.textContent?.trim() || '';
        const url = titleElement?.getAttribute('href') || '';
        
        jobs.push({
          title,
          company: this.companyName,
          description: '',  // Would need to fetch individual job pages for full description
          location: 'Indianapolis, IN',
          url: url.startsWith('http') ? url : `https://corteva.dejobs.org${url}`,
          source: this.baseUrl,
          external_id: url
        });
      });
      
      console.log(`Found ${jobs.length} jobs via HTML parsing`);
      return jobs;
    } catch (error) {
      console.error('Error scraping Corteva jobs:', error);
      return [];
    }
  }
}
