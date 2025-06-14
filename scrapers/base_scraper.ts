import { parseHTML } from 'linkedom'; // Import linkedom
import { JobListing, EventListing } from '@app-types';
import { ScraperConfigOptions } from './config_types';

export abstract class BaseScraper {
  protected companyName: string;
  protected baseUrl: string;
  protected readonly config: ScraperConfigOptions;

  protected static readonly DEFAULT_CONFIG: Required<Omit<ScraperConfigOptions, 'baseUrl'>> & Pick<ScraperConfigOptions, 'baseUrl'> = {
    maxItemsPerScraper: 20, // Default limit for items
    rateLimitMinMs: 1000,
    rateLimitRandomMs: 500,
    baseUrl: undefined, // Base URL must be provided by derived classes if not in config
  };
  
  constructor(companyName: string, initialBaseUrl: string, scraperConfig?: ScraperConfigOptions) {
    this.companyName = companyName;
    this.config = {
      ...BaseScraper.DEFAULT_CONFIG,
      ...scraperConfig,
      baseUrl: scraperConfig?.baseUrl || initialBaseUrl, // Prioritize config, then initial, then default (which is undefined)
    };
    this.baseUrl = this.config.baseUrl!; // Ensure baseUrl is set
    if (!this.baseUrl) {
        console.error(`[BaseScraper] Critical: Base URL not configured for ${companyName}.`);
        // throw new Error(`Base URL not configured for ${companyName}`); // Or handle as appropriate
    }
  }

  /**
   * Introduce a delay to respect rate limits.
   */
  protected async rateLimitDelay(): Promise<void> {
    const totalDelay = (this.config.rateLimitMinMs ?? BaseScraper.DEFAULT_CONFIG.rateLimitMinMs) + 
                       Math.random() * (this.config.rateLimitRandomMs ?? BaseScraper.DEFAULT_CONFIG.rateLimitRandomMs);
    // console.log(`[BaseScraper] Applying rate limit delay of ${totalDelay.toFixed(0)}ms...`); // Optional: for debugging
    await new Promise(resolve => setTimeout(resolve, totalDelay));
  }

  /**
   * Fetch HTML content from a URL using native fetch API
   */
  protected async fetchHtml(url: string): Promise<string> {
    try {
      await this.rateLimitDelay(); 
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0'
        },
        // Cloudflare Workers fetch does not support a direct timeout option like Axios.
        // You would typically implement a timeout using Promise.race if needed.
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  /**
   * Extract JSON-LD data from HTML
   */
  protected extractJsonLd(html: string, type: string = 'JobPosting'): any[] {
    const { document } = parseHTML(html);
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const results: any[] = [];

    jsonLdScripts.forEach((script: Element) => {
      try {
        const jsonContent = JSON.parse(script.textContent || '{}');
        
        // Handle array of items
        if (Array.isArray(jsonContent)) {
          jsonContent.forEach(item => {
            if (item['@type'] === type) {
              results.push(item);
            }
          });
        }
        // Handle single item
        else if (jsonContent['@type'] === type) {
          results.push(jsonContent);
        }
        // Handle itemListElement
        else if (jsonContent.itemListElement) {
          jsonContent.itemListElement.forEach((item: any) => {
            if (item['@type'] === type) {
              results.push(item);
            }
          });
        }
      } catch (error) {
        console.error('Error parsing JSON-LD:', error);
      }
    });

    return results;
  }

  /**
   * Normalize job data to our schema
   */
  protected normalizeJob(job: any): JobListing {
    // Default implementation - override in specific scrapers as needed
    return {
      title: job.title || '',
      company: this.companyName,
      description: job.description || '',
      location: typeof job.jobLocation === 'object'
        ? job.jobLocation.address?.addressLocality || 'Indianapolis, IN'
        : job.jobLocation || 'Indianapolis, IN',
      url: job.url || '',
      salary: job.baseSalary?.value || job.estimatedSalary?.value || '',
      job_type: job.employmentType || 'FULL_TIME',
      date_posted: job.datePosted || new Date().toISOString(),
      external_id: job.identifier || job.url || '',
      is_remote: job.jobLocationType === 'TELECOMMUTE' || false,
      skills: Array.isArray(job.skills) ? job.skills.join(',') : '',
      source: this.baseUrl,
      status: 'active'
    };
  }

  /**
   * Abstract method to be implemented by each scraper
   * Made generic to support both Job and Event listings temporarily
   */
  public abstract scrape(env?: any): Promise<JobListing[] | EventListing[]>; // Removed maxPages, should use this.config.maxItemsPerScraper
}
