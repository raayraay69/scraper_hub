import { BaseScraper } from './base_scraper';
import { EventListing } from '@app-types';
import { parseHTML } from 'linkedom'; // Import linkedom instead of cheerio

// Helper functions parseDateString and parseTimeRange are removed as they were for Markdown.
// New parsing helpers might be needed for specific date/time formats from the live site.

export class NoblesvilleMainstreetEventsScraper extends BaseScraper {
  constructor() {
    // Updated to the specific events page URL
    super('Noblesville Main Street', 'https://www.noblesvillemainstreet.org/events');
  }

  private parseTimeFromText(timeText: string): { startTime?: string, endTime?: string } {
    let startTime: string | undefined = undefined;
    let endTime: string | undefined = undefined;

    if (!timeText) {
      return { startTime, endTime };
    }

    const timeParts = timeText.split(/\s*<br>\s*|\s*–\s*|\s*-\s*/); // Split by <br>, – or -
    const timeRegex = /\d{1,2}:\d{2}\s*(?:AM|PM)/i;

    if (timeParts.length > 1) { // e.g. "Date <br> StartTime – EndTime" OR "StartTime - EndTime"
      // Check if the first part could be a date, if so, times start from index 1
      const firstPartIsLikelyDate = /[A-Za-z]+\s\d{1,2},\s\d{4}/.test(timeParts[0]) || /\d{4}-\d{2}-\d{2}/.test(timeParts[0]);
      let timeStartIndex = firstPartIsLikelyDate ? 1 : 0;

      if (timeParts[timeStartIndex]) {
        const potentialStartTime = timeParts[timeStartIndex].match(timeRegex);
        if (potentialStartTime) {
          startTime = potentialStartTime[0];
        }
      }

      if (timeParts[timeStartIndex + 1]) { // Potential end time
        const potentialEndTime = timeParts[timeStartIndex + 1].match(timeRegex);
        if (potentialEndTime) {
          endTime = potentialEndTime[0];
        }
      } else if (startTime && timeParts[timeStartIndex]) { 
        // Case: "StartTime – EndTime" where both are in the same part after date
        // e.g. eventTimeParagraph has "May 24, 2025 <br> 8:00 AM – 12:00 PM" -> timeParts[1] is "8:00 AM – 12:00 PM"
        // or eventMetaTime has "8:00 AM - 12:00 PM" -> timeParts[0] is "8:00 AM - 12:00 PM"
        const remainingTextAfterStartTime = timeParts[timeStartIndex].substring(startTime.length);
        const endMatch = remainingTextAfterStartTime.match(timeRegex);
        if (endMatch) {
          endTime = endMatch[0];
        }
      }
    } else if (timeParts.length === 1 && timeParts[0]) { // Only one part, could be "StartTime" or "StartTime - EndTime"
      const potentialStartTime = timeParts[0].match(timeRegex);
      if (potentialStartTime) {
        startTime = potentialStartTime[0];
        // Check for end time in the same string part
        const remainingTextAfterStartTime = timeParts[0].substring(startTime.length);
        const endMatch = remainingTextAfterStartTime.match(timeRegex);
        if (endMatch) {
          endTime = endMatch[0];
        }
      }
    }
    return { startTime, endTime };
  }

  private async parseEventPage(eventUrl: string): Promise<EventListing | null> {
    try {
      const html = await this.fetchHtml(eventUrl);
      if (!html) {
        console.error(`[NoblesvilleMainstreetEventsScraper] No HTML content for event page ${eventUrl}`);
        return null;
      }

      // Attempt JSON-LD extraction (though unlikely for Squarespace calendar)
      const jsonLdEvents = this.extractJsonLd(html, 'Event');
      if (jsonLdEvents && jsonLdEvents.length > 0) {
        const eventData = jsonLdEvents[0];
        console.log(`[NoblesvilleMainstreetEventsScraper] Extracted JSON-LD from ${eventUrl}`);
        // Basic mapping, needs careful review if JSON-LD is found and used
        const title = eventData.name || '';
        const startDateRaw = eventData.startDate;
        let parsedStartDate = '';
        let parsedStartTime: string | undefined = undefined;

        if (startDateRaw) {
          const dateObj = new Date(startDateRaw);
          // Ensure date is valid
          if (!isNaN(dateObj.getTime())) {
            parsedStartDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            parsedStartTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
          } else {
            console.warn(`[NoblesvilleMainstreetEventsScraper] Invalid date from JSON-LD startDateRaw: ${startDateRaw} for ${eventUrl}`);
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
                organizer: eventData.organizer?.name || 'Noblesville Main Street',
                source: this.baseUrl, // Main events page URL
                category: 'Community',
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
      }
      
      // Fallback to DOM parsing with linkedom
      const { document } = parseHTML(html);
      
      const titleEl = document.querySelector('h1.eventitem-title');
      const title = titleEl?.textContent?.trim() || '';
      if (!title) {
        console.warn(`[NoblesvilleMainstreetEventsScraper] No title found for ${eventUrl}`);
        return null;
      }

      // Date and Time parsing (Squarespace specific)
      // Example: <time class="event-date" datetime="2025-05-24">Saturday, May 24, 2025</time>
      // <time class="event-time-12hr" datetime="2025-05-24T08:00:00">8:00 AM</time> – <time class="event-time-12hr" datetime="2025-05-24T12:00:00">12:00 PM</time>
      // Or sometimes: <p class="event-time">Saturday, May 24, 2025 <br> 8:00 AM – 12:00 PM</p>
      let startDate = '';
      let startTime: string | undefined = undefined;
      let endTime: string | undefined = undefined;

      const eventDateEl = document.querySelector('time.event-date');
      if (eventDateEl) {
          const datetimeAttr = eventDateEl.getAttribute('datetime')?.trim();
          if (datetimeAttr) {
            // Validate YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(datetimeAttr)) {
              startDate = datetimeAttr;
            } else {
              console.warn(`[NoblesvilleMainstreetEventsScraper] Invalid date format in datetime attribute: ${datetimeAttr} for ${eventUrl}. Expected YYYY-MM-DD.`);
            }
          }
      }
      
      const eventTimeParagraph = document.querySelector('p.event-time')?.textContent?.trim() || '';
      if (eventTimeParagraph) {
          if (!startDate) { // Try to get date from this paragraph if not found above
              const dateMatch = eventTimeParagraph.match(/[A-Za-z]+\s\d{1,2},\s\d{4}/);
              if (dateMatch && dateMatch[0]) {
                  const parsed = new Date(dateMatch[0]);
                  // Ensure date is valid after parsing
                  if(!isNaN(parsed.getTime())) {
                    startDate = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
                  } else {
                    console.warn(`[NoblesvilleMainstreetEventsScraper] Could not parse date from eventTimeParagraph: ${dateMatch[0]} for ${eventUrl}`);
                  }
              }
          }
          // Use the new helper method for time parsing
          const parsedTimes = this.parseTimeFromText(eventTimeParagraph);
          startTime = parsedTimes.startTime;
          endTime = parsedTimes.endTime;

      } else { // Fallback to individual time elements if p.event-time not found/useful
          // This part remains as specific selectors for time.event-time-12hr might be more reliable
          // if p.event-time is structured differently or absent.
          const startTimeEl = document.querySelector('time.event-time-12hr'); // First element is usually start time
          const timeElements = Array.from(document.querySelectorAll('time.event-time-12hr'));
          
          startTime = startTimeEl?.textContent?.trim() || undefined;
          if (timeElements.length > 1) { // If there are multiple time elements
            endTime = timeElements[timeElements.length - 1]?.textContent?.trim() || undefined;
          }
          // If startTime and endTime are the same from multiple elements, or only one element found, clear endTime.
          if (startTime === endTime && timeElements.length <= 1) endTime = undefined;
      }


      if (!startDate) { // If still no date, try another common Squarespace selector like .eventitem-meta-date
          const eventMetaDateText = document.querySelector('.eventitem-meta-date')?.textContent?.trim() || '';
          if (eventMetaDateText) {
              const parsed = new Date(eventMetaDateText);
              // Ensure date is valid after parsing
              if(!isNaN(parsed.getTime())) {
                startDate = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
              } else {
                console.warn(`[NoblesvilleMainstreetEventsScraper] Could not parse date from eventMetaDate: ${eventMetaDateText} for ${eventUrl}`);
              }
          }
      }

       // If startTime is still undefined, try to parse from .eventitem-meta-time
       if (startTime === undefined) { // Check specifically for undefined, as empty string could be a valid parsed (but empty) time
            const eventMetaTimeFullText = document.querySelector('.eventitem-meta-time')?.textContent?.trim() || '';
            if (eventMetaTimeFullText) {
                 // Use the new helper method for time parsing from .eventitem-meta-time
                const parsedTimesFromMeta = this.parseTimeFromText(eventMetaTimeFullText);
                startTime = parsedTimesFromMeta.startTime;
                endTime = parsedTimesFromMeta.endTime;
            }
        }


      const description = document.querySelector('.eventitem-description')?.textContent?.trim() ||
                          document.querySelector('div.sqs-block-html p')?.textContent?.trim() || ''; // Common description selectors
      
      const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                       document.querySelector('.eventitem-image img')?.getAttribute('src') || '';
      
      // Venue/Location (often in a specific meta item or a link)
      const venueEl = document.querySelector('.eventitem-meta-location a');
      let venue = venueEl?.textContent?.trim() || 'Noblesville, IN';
      
      let address = '';
      if (venueEl) {
        const addressEl = document.querySelector('.eventitem-meta-location span:not(a)');
        address = addressEl?.textContent?.trim() || '';
      }
      
      if (venue === 'Noblesville, IN' && address === '') { // If default, check if location is in description
          const locationMatch = description.match(/Location:\s*(.*)/i) || description.match(/@\s*(.*)/i);
          if (locationMatch && locationMatch[1]) {
            venue = locationMatch[1].split(',')[0].trim(); // Basic parsing
          }
      }


      return {
        title,
        description,
        start_date: startDate,
        start_time: startTime,
        end_date: '', // Squarespace usually has start date only clearly defined per event item
        end_time: endTime,
        url: eventUrl,
        organizer: 'Noblesville Main Street',
        source: this.baseUrl, // Main events page URL
        category: 'Community',
        location: venue, 
        venue: venue !== 'Noblesville, IN' ? venue : 'Downtown Noblesville', // Be more specific if possible
        address,
        image_url: imageUrl.startsWith('http') ? imageUrl : (imageUrl ? new URL(imageUrl, "https://www.noblesvillemainstreet.org").toString() : ''),
        tags: '',
        price: '', // Price often not explicitly listed on Squarespace event pages
        is_free: description.toLowerCase().includes('free') || title.toLowerCase().includes('free') ? 1 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

    } catch (error: any) {
      console.error(`[NoblesvilleMainstreetEventsScraper] Error parsing event page ${eventUrl}: ${error.message}`, error.stack);
      return null;
    }
  }

  public async scrape(_maxPages?: number, env?: any): Promise<EventListing[]> {
    const allEvents: EventListing[] = [];
    let htmlContentMainPage: string;

    try {
      htmlContentMainPage = await this.fetchHtml(this.baseUrl); // this.baseUrl is now .../events
      if (!htmlContentMainPage) {
        console.error(`[NoblesvilleMainstreetEventsScraper] HTML content not found for ${this.baseUrl}.`);
        return [];
      }
    } catch (error) {
      console.error(`[NoblesvilleMainstreetEventsScraper] Error fetching HTML from ${this.baseUrl}:`, error);
      return [];
    }

    const { document: mainDoc } = parseHTML(htmlContentMainPage);
    const eventLinks: string[] = [];

    // Squarespace event list item selectors (common patterns)
    // .eventlist-item, .summary-item a (often title link is the one), article.eventlist-event--upcoming a
    mainDoc.querySelectorAll('article.eventlist-event--upcoming a.eventlist-title-link, .summary-item a.summary-title-link').forEach((element: Element) => {
      const link = element as HTMLAnchorElement;
      const relativeUrl = link.getAttribute('href');
      if (relativeUrl) {
        const fullUrl = new URL(relativeUrl, "https://www.noblesvillemainstreet.org").toString(); // Use the site's root for resolving relative URLs
        eventLinks.push(fullUrl);
      }
    });
    
    // Alternative selector if the above doesn't work: direct links with "View Event" text
    if (eventLinks.length === 0) {
        mainDoc.querySelectorAll('a.eventlist-readmore').forEach((element: Element) => {
            const link = element as HTMLAnchorElement;
            const relativeUrl = link.getAttribute('href');
            if (relativeUrl) {
                const fullUrl = new URL(relativeUrl, "https://www.noblesvillemainstreet.org").toString();
                eventLinks.push(fullUrl);
            }
        });
    }


    console.log(`[NoblesvilleMainstreetEventsScraper] Found ${eventLinks.length} potential event links.`);
    const uniqueEventLinks = [...new Set(eventLinks)]; // Remove duplicates

    // Limit processing for now
    const linksToProcess = uniqueEventLinks.slice(0, 10); 

    for (const eventUrl of linksToProcess) {
      try {
        const event = await this.parseEventPage(eventUrl);
        if (event) {
          allEvents.push(event);
        }
      } catch (error: any) {
        console.error(`[NoblesvilleMainstreetEventsScraper] Error processing event link ${eventUrl}: ${error.message}`);
      }
    }
    
    console.log(`[NoblesvilleMainstreetEventsScraper] Scraped ${allEvents.length} events.`);
    return allEvents;
  }
}
