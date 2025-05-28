import { BaseScraper } from './base_scraper';
import { EventListing } from '@app-types';
import { parseHTML } from 'linkedom';

// Markdown specific helpers (parseDateString, parseTimeRange) are removed.

export class NoblesvilleParksCalendarScraper extends BaseScraper {
  constructor() {
    // Target the main calendar page
    super('Noblesville Parks', 'https://www.noblesvilleparks.org/calendar.aspx');
  }

  private parseEventDateTime(dateTimeString: string): { date: string, time?: string, fullIso?: string } {
    // Example: "May 19, 2025, 5:30 PM - 7:00 PM" or "May 26, 2025, All Day"
    // Or from <time datetime="2025-05-19T17:30:00">
    const isoMatch = dateTimeString.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (isoMatch && isoMatch[1]) {
        const d = new Date(isoMatch[1]);
        return {
            date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
            fullIso: isoMatch[1],
        };
    }
    
    const dateParts = dateTimeString.split(',');
    if (dateParts.length < 2) return { date: ''}; // Not enough parts for Month Day, Year

    const dateStr = `${dateParts[0].trim()} ${dateParts[1].trim()}`;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: '' };
    
    const parsedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (dateParts.length > 2 && dateParts[2].toLowerCase().includes('all day')) {
        return { date: parsedDate, time: 'All Day' };
    } else if (dateParts.length > 2) {
        return { date: parsedDate, time: dateParts[2].trim() }; // This will contain "5:30 PM - 7:00 PM"
    }
    return { date: parsedDate };
  }


  private async parseEventPage(eventUrl: string): Promise<EventListing | null> {
    try {
      const html = await this.fetchHtml(eventUrl);
      if (!html) {
        console.error(`[NoblesvilleParksCalendarScraper] No HTML content for event page ${eventUrl}`);
        return null;
      }

      // JSON-LD is unlikely on CivicPlus calendar pages, but check anyway.
      const jsonLdEvents = this.extractJsonLd(html, 'Event');
      if (jsonLdEvents && jsonLdEvents.length > 0) {
          const eventData = jsonLdEvents[0];
          // Basic mapping, similar to other scrapers, assuming schema.org/Event
          const title = eventData.name || '';
          const startDateRaw = eventData.startDate;
          let parsedStartDate = '';
          let parsedStartTime: string | undefined = undefined;

          if (startDateRaw) {
            const dateObj = new Date(startDateRaw);
            if (!isNaN(dateObj.getTime())) {
              parsedStartDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
              parsedStartTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
            }
          }
          if (title && parsedStartDate) {
              return {
                title,
                description: eventData.description || '',
                start_date: parsedStartDate,
                start_time: parsedStartTime,
                end_date: eventData.endDate ? new Date(eventData.endDate).toISOString().split('T')[0] : '',
                end_time: eventData.endDate ? new Date(eventData.endDate).toISOString().split('T')[1].substring(0,5) : undefined,
                url: eventData.url || eventUrl,
                organizer: eventData.organizer?.name || 'Noblesville Parks',
                source: this.baseUrl,
                category: 'Park Event',
                location: eventData.location?.name || 'Noblesville, IN',
                venue: eventData.location?.name || '',
                address: eventData.location?.address?.streetAddress || '',
                image_url: Array.isArray(eventData.image) ? eventData.image[0] : eventData.image || '',
                tags: Array.isArray(eventData.keywords) ? eventData.keywords.join(', ') : '',
                price: eventData.offers?.[0]?.price ? `${eventData.offers[0].price} ${eventData.offers[0].priceCurrency || ''}`.trim() : '',
                is_free: eventData.isAccessibleForFree || (eventData.offers?.[0]?.price === 0) ? 1 : 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
          }
          console.log(`[NoblesvilleParksCalendarScraper] Parsed event from JSON-LD: ${title}`);
      }

      // DOM parsing for CivicPlus event detail page using linkedom
      const { document } = parseHTML(html);
      // Title is usually in a <h1 class="pageTitle"> or similar
      const titleEl = document.querySelector('h1.pageTitle, .editorWrap>h1, .editorWrap>h2');
      const title = titleEl?.textContent?.trim() || '';
      if (!title) {
        console.warn(`[NoblesvilleParksCalendarScraper] No title found for ${eventUrl}`);
        return null;
      }

      let startDate = '';
      let startTime: string | undefined = undefined;
      let endTime: string | undefined = undefined;
      let venue = '';
      let address = '';
      let cost = '';
      let description = '';

      // Look for event detail structure (CivicPlus specific)
      // Often details are in a div with class 'contentDiv' or 'editorWrap'
      // Or specific spans/divs for date, time, location
      
      // Example structure: <span id="event_date_638512345000000000" class="italicText">May 19, 2025</span>
      const dateEl = document.querySelector('span[id^="event_date_"]');
      const dateText = dateEl?.textContent?.trim() || '';
      if (dateText) {
          const d = new Date(dateText.replace(/,/g, ''));
          if (!isNaN(d.getTime())) {
            startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
      }
      
      // Example: <span id="event_time_638512345000000000" class="italicText">5:30 PM - 7:00 PM</span>
      const timeEl = document.querySelector('span[id^="event_time_"]');
      const timeText = timeEl?.textContent?.trim() || '';
      if (timeText && timeText.toLowerCase() !== 'all day') {
          const parts = timeText.split(/\s*-\s*/);
          startTime = parts[0]?.trim() || undefined;
          endTime = parts[1]?.trim() || undefined;
      } else if (timeText.toLowerCase() === 'all day') {
          startTime = 'All Day';
      }

      // Example: <span id="event_location_638512345000000000">HotBox Pizza</span>
      const venueEl = document.querySelector('span[id^="event_location_"]');
      venue = venueEl?.textContent?.trim() || '';
      
      // Address might be separate or part of a general description.
      // Example: <div id="event_address_638512345000000000">14300 Mundy Dr. <br />Noblesville, IN 46060</div>
      const addressEl = document.querySelector('div[id^="event_address_"]');
      address = addressEl?.textContent?.trim().replace(/\s*\n\s*/g, ', ') || '';

      // Cost: <div id="event_cost_638512345000000000">Free for all!</div>
      const costEl = document.querySelector('div[id^="event_cost_"]');
      cost = costEl?.textContent?.trim() || '';

      // Description: Often in a div after the title or details.
      // This needs to be a bit more robust. Look for a main content block.
      // Try to find the main content area, often within '.editorWrap' or similar.
      // Then find the text after the title and structured details.
      let descriptionContainer = document.querySelector('.editorWrap') || document.querySelector('div.contentDiv');
      if (descriptionContainer) {
        // Clone the container to avoid modifying the original DOM
        const descriptionClone = descriptionContainer.cloneNode(true) as HTMLElement;
        
        // Remove known structured elements to isolate description
        ['h1', 'h2', 'span[id^="event_"]', 'div[id^="event_"]'].forEach(selector => {
          descriptionClone.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        description = descriptionClone.textContent?.trim() || '';
        
        // A common pattern is that the title is repeated as the first line of description
        if (description.startsWith(title)) {
          description = description.substring(title.length).trim();
        }
      }

      // Get image URL from meta tag
      const imageMetaTag = document.querySelector('meta[property="og:image"]');
      const imageUrl = imageMetaTag?.getAttribute('content') || '';

      return {
        title,
        description,
        start_date: startDate,
        start_time: startTime,
        end_date: '', // Detail pages usually for single occurrences or start of series
        end_time: endTime,
        url: eventUrl,
        organizer: 'Noblesville Parks',
        source: this.baseUrl, // Main calendar URL
        category: 'Park Event', // Or detect from content if possible
        location: venue || 'Noblesville, IN',
        venue: venue || 'Noblesville Park Location',
        address: address || (venue !== 'Noblesville, IN' ? venue : ''), // Use venue if address not specific
        image_url: imageUrl,
        tags: '', // Could parse from keywords if available
        price: cost,
        is_free: cost.toLowerCase().includes('free') || cost === '' ? 1 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

    } catch (error: any) {
      console.error(`[NoblesvilleParksCalendarScraper] Error parsing event page ${eventUrl}: ${error.message}`, error.stack);
      return null;
    }
  }


  public async scrape(_maxPages?: number, env?: any): Promise<EventListing[]> {
    const allEvents: EventListing[] = [];
    let htmlContentMainPage: string;

    try {
      htmlContentMainPage = await this.fetchHtml(this.baseUrl); // Fetch /calendar.aspx
      if (!htmlContentMainPage) {
        console.error(`[NoblesvilleParksCalendarScraper] HTML content not found for ${this.baseUrl}.`);
        return [];
      }
    } catch (error) {
      console.error(`[NoblesvilleParksCalendarScraper] Error fetching HTML from ${this.baseUrl}:`, error);
      return [];
    }

    const { document: mainDoc } = parseHTML(htmlContentMainPage);
    const eventLinks: string[] = [];

    // Selector for Community Calendar event links (those with "More Details" and EID)
    // Example: <a href="/Calendar.aspx?EID=869&amp;month=5&amp;year=2025&amp;day=19&amp;calType=0">More Details</a>
    // We need to find the link associated with a "Community Calendar" event item.
    // Events are often in list items (li) or divs.
    // The text "Community Calendar" appears as a header. We want events listed under it.
    
    // Find the "Community Calendar" header and process its siblings or parent's children
    const communityCalendarHeader = mainDoc.querySelector('a[name="communityList"]')?.nextElementSibling;
    let eventElements: HTMLElement[] = [];
    
    if (communityCalendarHeader) {
      eventElements = Array.from(communityCalendarHeader.querySelectorAll('div.item, li.item'));
    }
    
    if(eventElements.length === 0) { // Fallback if specific anchor/structure isn't found
        // Look for list items that contain a "More Details" link.
        // This is less precise but might catch events if the structure is flat.
        // This selector targets links that have "More Details" text and an EID in href
        mainDoc.querySelectorAll('a[href*="EID="]').forEach((el: Element) => {
            const link = el as HTMLAnchorElement;
            if (link.textContent?.trim().toLowerCase() === 'more details') {
                 const href = link.getAttribute('href');
                 if (href && !href.startsWith('http') && !href.includes('secure.rec1.com')) {
                    eventLinks.push(href);
                 }
            }
        });
    } else {
        eventElements.forEach((item: HTMLElement) => {
            const linkElement = item.querySelector('a[href*="EID="]') as HTMLAnchorElement;
            if (linkElement) {
              const href = linkElement.getAttribute('href');
              // Ensure it's a local link and not a CivicRec link
              if (href && !href.startsWith('http') && !href.includes('secure.rec1.com')) {
                eventLinks.push(href);
              }
            }
        });
    }


    console.log(`[NoblesvilleParksCalendarScraper] Found ${eventLinks.length} potential Community Calendar event links.`);
    const uniqueEventLinks = [...new Set(eventLinks)];

    // Limit processing for now
    const linksToProcess = uniqueEventLinks.slice(0, 10); 

    for (const relativeUrl of linksToProcess) {
      try {
        const fullEventUrl = new URL(relativeUrl, "https://www.noblesvilleparks.org").toString();
        const event = await this.parseEventPage(fullEventUrl);
        if (event) {
          allEvents.push(event);
        }
      } catch (error: any) {
        console.error(`[NoblesvilleParksCalendarScraper] Error processing event link ${relativeUrl}: ${error.message}`);
      }
    }
    
    console.log(`[NoblesvilleParksCalendarScraper] Scraped ${allEvents.length} events.`);
    return allEvents;
  }
}
