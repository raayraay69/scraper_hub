import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
import { parseHTML } from 'linkedom'; // Import linkedom instead of cheerio

export class RollsRoyceScraper extends BaseScraper {
  constructor() {
    super('Rolls-Royce Corporation', 'https://careers.rolls-royce.com/');
  }

  public async scrape(): Promise<JobListing[]> {
    // Temporarily disabled for testing backend deployment issues
    // console.log('RollsRoyceScraper.scrape() called, but cheerio usage is temporarily disabled.');
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
      
      // Rolls-Royce typically uses a job listing component with specific classes
      document.querySelectorAll('.job-listing, .vacancy-item, .job-card').forEach((element: Element) => {
        const titleElement = element.querySelector('.job-title, .title, h3, .vacancy-title');
        const title = titleElement?.textContent?.trim() || '';
        
        const urlElement = element.querySelector('a');
        const url = urlElement?.getAttribute('href') || '';
        
        const locationElement = element.querySelector('.location, .job-location, .vacancy-location');
        const location = locationElement?.textContent?.trim() || '';
        
        // Only include Indianapolis jobs
        if (title && url && (location.includes('Indianapolis') || location.includes('IN'))) {
          const descriptionElement = element.querySelector('.job-description, .description, .vacancy-description');
          const description = descriptionElement?.textContent?.trim() || '';

          jobs.push({
            title,
            company: this.companyName,
            description,
            location: location || 'Indianapolis, IN',
            url: url.startsWith('http') ? url : `https://careers.rolls-royce.com${url}`,
            source: this.baseUrl,
            external_id: url
          });
        }
      });
      
      console.log(`Found ${jobs.length} jobs via HTML parsing`);
      return jobs;
    } catch (error) {
      console.error('Error scraping Rolls-Royce jobs:', error);
      return [];
    }
  }
}
