import { BaseScraper } from './base_scraper';
import { JobListing } from '@app-types';
import { parseHTML } from 'linkedom';
import axios from 'axios'; // Keep for now, but usage will be commented
import Parser from 'rss-parser'; // Added rss-parser import

export class CommunityHealthScraper extends BaseScraper {
  constructor() {
    super('Community Health Network', 'https://www.ecommunity.com/careers');
  }

  public async scrape(): Promise<JobListing[]> {
    try {
      console.log(`Scraping jobs from ${this.baseUrl}`);

      // Try RSS feed first
      try {
        const rssUrl = `${this.baseUrl}/rss`;
        console.log(`Attempting to fetch RSS feed from ${rssUrl}`);
        const response = await fetch(rssUrl, { signal: AbortSignal.timeout(10000) });

        if (response.ok) {
          const xmlText = await response.text();
          const parser = new Parser(); // Changed from xml2js.Parser
          const feed = await parser.parseString(xmlText); // Changed from parser.parseStringPromise(xmlText)
          
          const items = feed.items; // Changed from result.rss.channel.item
          const jobs: JobListing[] = [];

          if (Array.isArray(items)) {
            for (const item of items) {
              jobs.push({
                title: item.title,
                company: this.companyName,
                description: item.contentSnippet || item.content || '', // Adjusted for rss-parser
                location: 'Indianapolis, IN',
                url: item.link,
                date_posted: item.isoDate || item.pubDate, // Adjusted for rss-parser
                external_id: item.guid || item.link, // Adjusted for rss-parser
                source: this.baseUrl
              });
            }
          } else if (items) { // This else if might be redundant if feed.items is always an array
            // Handle case where there's only one item (less common with rss-parser's feed.items)
            const item = items as any; // Type assertion if items is not an array here
            jobs.push({
              title: item.title,
              company: this.companyName,
              description: item.contentSnippet || item.content || '', // Adjusted for rss-parser
              location: 'Indianapolis, IN',
              url: item.link,
              date_posted: item.isoDate || item.pubDate, // Adjusted for rss-parser
              external_id: item.guid || item.link, // Adjusted for rss-parser
              source: this.baseUrl
            });
          }
          
          console.log(`Found ${jobs.length} jobs via RSS feed`);
          return jobs;
        }
      } catch (rssError) {
        console.log('RSS feed not available, falling back to HTML parsing:', rssError); // Log the error
      }

      // Fallback to HTML parsing
      const html = await this.fetchHtml(this.baseUrl);

      // Try JSON-LD first
      const jsonLdJobs = this.extractJsonLd(html);

      if (jsonLdJobs.length > 0) {
        console.log(`Found ${jsonLdJobs.length} jobs via JSON-LD`);
        return jsonLdJobs.map(job => this.normalizeJob(job));
      }

      // Fallback to HTML parsing
      console.log('No JSON-LD found, parsing HTML directly');
      const { document } = parseHTML(html);
      const jobs: JobListing[] = [];

      document.querySelectorAll('.career-listing .title').forEach((element: Element) => {
        const title = element.textContent?.trim() || '';
        const anchorElement = element.querySelector('a');
        const url = anchorElement?.getAttribute('href') || '';

        jobs.push({
          title,
          company: this.companyName,
          description: '', 
          location: 'Indianapolis, IN',
          url: url.startsWith('http') ? url : `https://www.ecommunity.com${url}`,
          source: this.baseUrl,
          external_id: url
        });
      });

      console.log(`Found ${jobs.length} jobs via HTML parsing`);
      return jobs;
    } catch (error) {
      console.error('Error scraping Community Health jobs:', error);
      return [];
    }
  }
}
