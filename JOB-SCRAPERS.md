# Naptown Hub Job & Event Scrapers

This document provides an overview of the job and event scraping systems implemented for Naptown Hub.

## Overview

The scraping systems automatically collect job listings and events from various sources and add them to the Naptown Hub database. This helps keep the platform populated with relevant, local opportunities and events without manual entry.

### Job Scraping

The job scraping system collects job listings from major Indianapolis employers and adds them to the Naptown Hub database.

### Event Scraping

The event scraping system collects events from local event sources like Do317 and adds them to the Naptown Hub database.

## Supported Sources

### Job Sources

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

### Event Sources

The system currently supports scraping events from the following sources:

1. **Do317** - https://do317.com/events

## Architecture

The scraping systems consist of the following components:

### 1. Base Scraper

The `BaseScraper` class provides common functionality for all scrapers:
- Fetching HTML content
- Extracting JSON-LD data
- Normalizing job data to a common format

### 2. Company-Specific Scrapers

Each company has its own scraper class that extends the `BaseScraper` class. These scrapers handle the specific details of extracting job data from each company's website.

### 3. Scraper Manager

The `ScraperManager` class coordinates the execution of all scrapers and handles storing the results in the database.

### 4. API Endpoints

The system exposes API endpoints for triggering scraping:

#### Job Scraping Endpoints
- `POST /api/jobs/scrape` - Run all job scrapers
- `POST /api/jobs/scrape/:company` - Run a specific company's scraper

#### Event Scraping Endpoints
- `POST /api/events/scrape` - Run all event scrapers
- `POST /api/events/scrape/:source` - Run a specific event source's scraper

### 5. Scheduled Tasks

The system automatically runs the scrapers on a schedule to keep the listings up to date:

- **Job Scrapers**: Run every 12 hours
- **Event Scrapers**: Run every 12 hours

## Implementation Details

### Scraping Strategies

The scrapers use a multi-tiered approach to extract job data:

1. **JSON-LD First**: Try to extract structured job data from JSON-LD scripts in the HTML.
2. **Embedded JSON**: Look for job data in embedded JSON objects in script tags.
3. **HTML Parsing**: Fall back to parsing HTML elements if structured data is not available.

### Data Normalization

All job data is normalized to a common format before being stored in the database:

```typescript
interface JobListing {
  title: string;
  company: string;
  description: string;
  location: string;
  url: string;
  salary?: string;
  job_type?: string;
  date_posted?: string;
  external_id?: string;
  is_remote?: boolean;
  skills?: string;
  source?: string;
  status?: 'active' | 'expired' | 'filled';
}
```

### Deduplication

The system uses the `external_id` field (typically the job URL or a unique identifier from the source) to prevent duplicate job listings. When a job is scraped:

1. If a job with the same `external_id` and `company` exists, it's updated.
2. If no matching job exists, a new job listing is created.

## Usage

### Running Scrapers Manually

You can run the scrapers manually using the provided PowerShell scripts:

#### Job Scrapers

```powershell
# Run all job scrapers
.\run-job-scrapers.ps1

# Run a specific company's scraper
.\run-job-scrapers.ps1 -company lilly
```

#### Event Scrapers

```powershell
# Run all event scrapers
.\run-event-scrapers.ps1

# Run a specific event source's scraper
.\run-event-scrapers.ps1 -source do317
```

### API Access

Admin users can trigger scraping via the API:

#### Job Scraping

```http
POST /api/jobs/scrape
Authorization: Bearer <admin_token>
```

Or for a specific company:

```http
POST /api/jobs/scrape/lilly
Authorization: Bearer <admin_token>
```

#### Event Scraping

```http
POST /api/events/scrape
Authorization: Bearer <admin_token>
```

Or for a specific event source:

```http
POST /api/events/scrape/do317
Authorization: Bearer <admin_token>
```

## Maintenance

### Adding a New Source

#### Adding a New Company

To add a new job scraper:

1. Create a new class that extends `BaseScraper`
2. Implement the `scrape()` method
3. Add the new scraper to the `jobScrapers` array in the `ScraperManager` class

#### Adding a New Event Source

To add a new event scraper:

1. Create a new class that extends `BaseScraper`
2. Implement the `scrape()` method
3. Add the new scraper to the `eventScrapers` array in the `ScraperManager` class

### Troubleshooting

If a scraper stops working, it's usually due to changes in the company's website structure. Check:

1. Has the URL changed?
2. Has the HTML structure changed?
3. Is JSON-LD still available?

## Future Enhancements

1. **Error Reporting**: Implement detailed error reporting for failed scrapes.
2. **Metrics Dashboard**: Create a dashboard to track scraping success rates and job counts.
3. **More Companies**: Add support for more Indianapolis employers.
4. **Advanced Filtering**: Improve filtering to only include relevant jobs.
5. **Full Text Extraction**: Enhance scrapers to fetch full job descriptions from detail pages.
