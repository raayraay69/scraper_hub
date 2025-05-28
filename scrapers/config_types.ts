export interface ScraperConfigOptions {
  maxItemsPerScraper?: number;
  rateLimitMinMs?: number;
  rateLimitRandomMs?: number;
  // maxRetries?: number; // For future use
  // fetchTimeoutMs?: number; // For future use
  baseUrl?: string; // To make scraper base URLs configurable
}
