import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
import * as xml2js from 'xml2js'; // Keep for now, but usage will be commented

export class AnthemScraper extends BaseScraper {
  constructor() {
    super('Anthem Inc.', 'https://www.indeed.com/rss?q=anthem&l=Indianapolis%2C+IN');
  }

  public async scrape(): Promise<JobListing[]> {
    // Temporarily disabled for testing backend deployment issues
    // console.log('AnthemScraper.scrape() called, but xml2js/axios usage is temporarily disabled.');
    return Promise.resolve([]);
  }
}
