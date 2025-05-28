import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
import { parseHTML } from 'linkedom'; // Import linkedom instead of cheerio

export class FinishLineScraper extends BaseScraper {
  constructor() {
    super('Finish Line', 'https://finishline.wd1.myworkdayjobs.com/Corporate_Careers');
  }

  public async scrape(): Promise<JobListing[]> {
    // Temporarily disabled for testing backend deployment issues
    // console.log('FinishLineScraper.scrape() called, but cheerio usage is temporarily disabled.');
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
      const script = document.querySelector('#__JOB_LISTINGS__');
      
      if (script) {
        try {
          const jsonData = JSON.parse(script.textContent || '{}');
          
          if (jsonData.jobs && Array.isArray(jsonData.jobs)) {
            console.log(`Found ${jsonData.jobs.length} jobs in embedded JSON`);
            
            return jsonData.jobs
              .filter((job: any) =>
                job.location &&
                (job.location.includes('Indianapolis') || job.location.includes('IN'))
              )
              .map((job: any) => ({
                title: job.title || '',
                company: this.companyName,
                description: job.description || '',
                location: job.location || 'Indianapolis, IN',
                url: job.url || `${this.baseUrl}/${job.id}`,
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
      
      // Fallback to HTML parsing
      console.log('No embedded JSON found, falling back to HTML parsing');
      const jobs: JobListing[] = [];
      
      // Workday typically uses a specific structure for job listings
      document.querySelectorAll('.WGDC, .gwt-Label, .job-listing').forEach((element: Element) => {
        const titleElement = element.querySelector('.job-title, .title, h3');
        const title = titleElement?.textContent?.trim() || '';
        
        const urlElement = element.querySelector('a');
        const url = urlElement?.getAttribute('href') || '';
        
        const locationElement = element.querySelector('.location, .job-location');
        const location = locationElement?.textContent?.trim() || '';
        
        // Only include Indianapolis jobs
        if (title && (location.includes('Indianapolis') || location.includes('IN'))) {
          jobs.push({
            title,
            company: this.companyName,
            description: '',  // Would need to fetch individual job pages for full description
            location: location || 'Indianapolis, IN',
            url: url.startsWith('http') ? url : `https://finishline.wd1.myworkdayjobs.com${url}`,
            source: this.baseUrl,
            external_id: url
          });
        }
      });
      
      console.log(`Found ${jobs.length} jobs via HTML parsing`);
      return jobs;
    } catch (error) {
      console.error('Error scraping Finish Line jobs:', error);
      return [];
    }
  }
}
