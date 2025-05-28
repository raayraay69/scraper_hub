# Naptown Hub Job Scraping System

This document provides a comprehensive guide to the job scraping system implemented for Naptown Hub.

## Overview

The job scraping system automatically collects job listings from major Indianapolis employers and adds them to the Naptown Hub database. This helps keep the platform populated with relevant, local job opportunities without manual entry.

## Architecture

The job scraping system consists of the following components:

1. **Base Scraper**: A common framework for all scrapers
2. **Company-Specific Scrapers**: Individual scrapers for each company
3. **Scraper Manager**: Coordinates the execution of scrapers
4. **Database Schema**: Stores job listings and scraper run metrics
5. **API Endpoints**: Allows manual triggering of scrapers
6. **Scheduled Tasks**: Automatically runs scrapers on a schedule

## Database Schema

### job_listings Table

```sql
CREATE TABLE IF NOT EXISTS job_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  url TEXT NOT NULL,
  salary TEXT,
  job_type TEXT,
  date_posted TIMESTAMP,
  external_id TEXT,
  is_remote BOOLEAN DEFAULT 0,
  skills TEXT,
  source TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'filled'
  is_featured BOOLEAN DEFAULT 0,
  is_urgent BOOLEAN DEFAULT 0,
  is_spotlight BOOLEAN DEFAULT 0,
  featured_until TIMESTAMP,
  urgent_until TIMESTAMP,
  spotlight_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### scraper_runs Table

```sql
CREATE TABLE IF NOT EXISTS scraper_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scraper_name TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status TEXT NOT NULL, -- 'running', 'success', 'failed'
  jobs_found INTEGER DEFAULT 0,
  jobs_added INTEGER DEFAULT 0,
  jobs_updated INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Supported Companies

The system currently supports scraping jobs from the following companies:

1. **Eli Lilly & Co.** - https://jobsearch.lilly.com/locations/indianapolis-in/jobs/
2. **Anthem Inc.** - via Indeed RSS feed
3. **Roche Diagnostics** - https://careers.roche.com/global/en/indianapolis-indiana
4. **Corteva Agriscience** - https://corteva.dejobs.org/locations/indianapolis-in/jobs/
5. **Community Health Network** - https://www.ecommunity.com/careers
6. **Cummins Inc.** - https://www.cummins.com/careers
7. **Indiana University Health** - https://careers.iuhealth.org/
8. **Rolls-Royce Corporation** - https://careers.rolls-royce.com/
9. **Angi (formerly Angie's List)** - https://www.angi.com/careers
10. **Finish Line** - https://finishline.wd1.myworkdayjobs.com/Corporate_Careers

## Implementation Details

### Scraping Strategies

The scrapers use a multi-tiered approach to extract job data:

1. **JSON-LD First**: Try to extract structured job data from JSON-LD scripts in the HTML.
2. **Embedded JSON**: Look for job data in embedded JSON objects in script tags.
3. **HTML Parsing**: Fall back to parsing HTML elements if structured data is not available.

### Deduplication

The system uses the `external_id` field (typically the job URL or a unique identifier from the source) to prevent duplicate job listings. When a job is scraped:

1. If a job with the same `external_id` and `company` exists, it's updated.
2. If no matching job exists, a new job listing is created.

### Scheduled Tasks

The system automatically runs the job scrapers on a schedule:

1. **Every 12 Hours**: Runs all job scrapers to keep listings up to date.
2. **Daily at Midnight**: Expires premium job listings that have passed their promotion end date.

## Usage

### Running Migrations

To set up the database schema:

```powershell
./run-migrations.ps1
```

### Testing Scrapers

To test the job scrapers:

```powershell
# Test all scrapers
./test-job-scrapers.ps1

# Test a specific company's scraper
./test-job-scrapers.ps1 -company lilly
```

### Running Scrapers Manually

You can run the job scrapers manually using the provided PowerShell script:

```powershell
# Run all scrapers
./run-job-scrapers.ps1

# Run a specific company's scraper
./run-job-scrapers.ps1 -company lilly
```

### API Access

Admin users can trigger job scraping via the API:

```http
POST /api/jobs/scrape
Authorization: Bearer <admin_token>
```

Or for a specific company:

```http
POST /api/jobs/scrape/lilly
Authorization: Bearer <admin_token>
```

## Deployment

To deploy the application with the job scraping system:

```powershell
./deploy.ps1
```

This will:
1. Run database migrations
2. Build the frontend
3. Deploy the backend
4. Deploy the frontend

## Monitoring

The system tracks scraper runs in the `scraper_runs` table, which can be used to monitor the health of the scrapers. You can query this table to see:

1. When scrapers were last run
2. How many jobs were found
3. Any errors that occurred

## Troubleshooting

### Common Issues

1. **Scraper Fails**: Check if the company's website structure has changed. Update the scraper to match the new structure.
2. **No Jobs Found**: Verify that the URL is correct and that the company has jobs listed.
3. **Duplicate Jobs**: Check the deduplication logic and ensure `external_id` is being set correctly.

### Logs

Check the Cloudflare Workers logs for detailed error messages:

```powershell
npx wrangler tail
```

## Maintenance

### Adding a New Company

To add a new company scraper:

1. Create a new class that extends `BaseScraper`
2. Implement the `scrape()` method
3. Add the new scraper to the `ScraperManager` class

### Updating Existing Scrapers

If a company's website structure changes, you may need to update the scraper:

1. Check if JSON-LD is still available
2. Update the HTML selectors if needed
3. Test the scraper to ensure it's working correctly

## Best Practices

1. **Respect robots.txt**: Always check if scraping is allowed.
2. **Rate Limiting**: Don't overwhelm the target websites with requests.
3. **Error Handling**: Gracefully handle errors and log them for debugging.
4. **Testing**: Regularly test scrapers to ensure they're working correctly.
5. **Monitoring**: Set up alerts for scraper failures or low job counts.
