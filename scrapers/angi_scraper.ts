import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
import { parseHTML } from 'linkedom'; // Import linkedom instead of cheerio

export class AngiScraper extends BaseScraper {
  constructor() {
    super('Angi', 'https://www.angi.com/careers');
  }

  public async scrape(): Promise<JobListing[]> {
    // Temporarily disabled for testing backend deployment issues
    // console.log('AngiScraper.scrape() called, but cheerio usage is temporarily disabled.');
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
      
      document.querySelectorAll('.job-opening-card').forEach((element: Element) => {
        const titleElement = element.querySelector('.job-title');
        const title = titleElement?.textContent?.trim() || '';
        
        const urlElement = element.querySelector('a');
        const url = urlElement?.getAttribute('href') || '';
        
        const locationElement = element.querySelector('.job-location');
        const location = locationElement?.textContent?.trim() || '';
        
        // Only include Indianapolis jobs
        if (title && url && (location.includes('Indianapolis') || location.includes('IN'))) {
          const descriptionElement = element.querySelector('.job-description');
          const description = descriptionElement?.textContent?.trim() || '';

          jobs.push({
            title,
            company: this.companyName,
            description,
            location: location || 'Indianapolis, IN',
            url: url.startsWith('http') ? url : `https://www.angi.com${url}`,
            source: this.baseUrl,
            external_id: url
          });
        }
      });
      
      console.log(`Found ${jobs.length} jobs via HTML parsing`);
      return jobs;
    } catch (error) {
      console.error('Error scraping Angi jobs:', error);
      return [];
    }
  }
}
