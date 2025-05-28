import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
import { parseHTML } from 'linkedom'; // Import linkedom instead of cheerio

export class CumminsScraper extends BaseScraper {
  constructor() {
    super('Cummins Inc.', 'https://www.cummins.com/careers');
  }

  public async scrape(): Promise<JobListing[]> {
    // Temporarily disabled for testing backend deployment issues
    // console.log('CumminsScraper.scrape() called, but cheerio usage is temporarily disabled.');
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
      
      // Look for embedded JSON in script tags
      const { document } = parseHTML(html);
      const scripts = document.querySelectorAll('script');
      
      for (const script of scripts) {
        const content = script.textContent || '';
        if (content.includes('window.__INITIAL_STATE__')) {
          try {
            // Extract JSON from script
            const jsonStr = content.split('window.__INITIAL_STATE__=')[1].split(';')[0];
            const data = JSON.parse(jsonStr);
            
            if (data.jobs && Array.isArray(data.jobs)) {
              console.log(`Found ${data.jobs.length} jobs in embedded JSON`);
              
              return data.jobs.map((job: any) => ({
                title: job.title || '',
                company: this.companyName,
                description: job.description || '',
                location: job.location || 'Indianapolis, IN',
                url: job.url || `${this.baseUrl}/job/${job.id}`,
                salary: job.salary || '',
                job_type: job.employmentType || 'FULL_TIME',
                date_posted: job.datePosted || new Date().toISOString(),
                external_id: job.id || job.url || '',
                is_remote: job.isRemote || false,
                source: this.baseUrl
              }));
            }
          } catch (jsonError) {
            console.error('Error parsing embedded JSON:', jsonError);
          }
        }
      }
      
      // Fallback to HTML parsing
      console.log('No embedded JSON found, falling back to HTML parsing');
      const jobs: JobListing[] = [];
      
      document.querySelectorAll('.job-listing, .careers-listing, .job-item').forEach((element: Element) => {
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
            url: url.startsWith('http') ? url : `https://www.cummins.com${url}`,
            source: this.baseUrl,
            external_id: url
          });
        }
      });
      
      console.log(`Found ${jobs.length} jobs via HTML parsing`);
      return jobs;
    } catch (error) {
      console.error('Error scraping Cummins jobs:', error);
      return [];
    }
  }
}
