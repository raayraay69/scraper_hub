import { BaseScraper } from './base_scraper';
import { EventListing } from '@app-types';
// Cheerio might not be needed if JSON-LD is comprehensive
// import * as cheerio from 'cheerio'; 

// Markdown specific helper (parseMonthDay) is removed.

export class VisitHamiltonCountyEventsScraper extends BaseScraper {
  constructor() {
    // Updated to the specific events page URL
    super('Visit Hamilton County', 'https://www.visithamiltoncounty.com/events/');
  }

  public async scrape(_maxPages?: number, env?: any): Promise<EventListing[]> {
    const allEvents: EventListing[] = [];
    let htmlContent: string;

    try {
      htmlContent = await this.fetchHtml(this.baseUrl); // Fetch /events/
      if (!htmlContent) {
        console.error(`[VisitHamiltonCountyEventsScraper] HTML content not found for ${this.baseUrl}.`);
        return [];
      }
    } catch (error) {
      console.error(`[VisitHamiltonCountyEventsScraper] Error fetching HTML from ${this.baseUrl}:`, error);
      return [];
    }

    // Attempt to extract JSON-LD from the main events page
    // Simpleview sites often embed multiple Event objects or an ItemList
    const jsonDataArray = this.extractJsonLd(htmlContent, 'Event'); 

    if (jsonDataArray && jsonDataArray.length > 0) {
      console.log(`[VisitHamiltonCountyEventsScraper] Found ${jsonDataArray.length} JSON-LD event objects on the main events page.`);
      for (const eventData of jsonDataArray) {
        try {
          const title = eventData.name || '';
          const url = eventData.url || ''; // Should be absolute URL from JSON-LD
          const startDateRaw = eventData.startDate;
          const endDateRaw = eventData.endDate;
          
          let parsedStartDate = '';
          let parsedStartTime: string | undefined = undefined;
          if (startDateRaw) {
            const dateObj = new Date(startDateRaw); // JSON-LD dates are usually ISO
            if (!isNaN(dateObj.getTime())) {
              parsedStartDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
              parsedStartTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
            }
          }

          let parsedEndDate = '';
          let parsedEndTime: string | undefined = undefined;
          if (endDateRaw) {
            const dateObj = new Date(endDateRaw);
            if (!isNaN(dateObj.getTime())) {
              parsedEndDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
              parsedEndTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
            }
          }
          
          const locationName = eventData.location?.name;
          const addressLocality = eventData.location?.address?.addressLocality;
          const addressRegion = eventData.location?.address?.addressRegion;
          const streetAddress = eventData.location?.address?.streetAddress;
          const postalCode = eventData.location?.address?.postalCode;

          let locationString = 'Hamilton County, IN'; // Default
          if (locationName) {
            locationString = locationName;
          } else if (addressLocality && addressRegion) {
            locationString = `${addressLocality}, ${addressRegion}`;
          } else if (addressLocality) {
            locationString = addressLocality;
          }
          
          let fullAddress = streetAddress || '';
          if (addressLocality && addressRegion && postalCode) {
              if(fullAddress) fullAddress += `, ${addressLocality}, ${addressRegion} ${postalCode}`;
              else fullAddress = `${addressLocality}, ${addressRegion} ${postalCode}`;
          }


          const venue = locationName || 'Venue not specified';
          
          const imageUrl = Array.isArray(eventData.image) ? eventData.image[0] : eventData.image || '';
          
          let priceText = '';
          const offers = eventData.offers; // Can be single object or array
          if (offers) {
            const firstOffer = Array.isArray(offers) ? offers[0] : offers;
            if (firstOffer?.price) {
              priceText = `${firstOffer.price} ${firstOffer.priceCurrency || ''}`.trim();
            } else if (firstOffer?.priceSpecification?.price) {
              priceText = `${firstOffer.priceSpecification.price} ${firstOffer.priceSpecification.priceCurrency || ''}`.trim();
            }
          }
          
          const isFree = eventData.isAccessibleForFree === true || 
                         (offers && (Array.isArray(offers) ? offers : [offers]).some(o => o.price === 0 || o.price === '0')) ||
                         priceText.toLowerCase() === 'free';

          const organizer = eventData.organizer?.name || 'Visit Hamilton County';
          const description = eventData.description || '';
          const keywords = eventData.keywords; // Often an array or comma-separated string
          const tags = Array.isArray(keywords) ? keywords.join(', ') : (typeof keywords === 'string' ? keywords : '');

          if (title && url && parsedStartDate) {
            const event: EventListing = {
              title,
              description,
              start_date: parsedStartDate,
              start_time: parsedStartTime,
              end_date: parsedEndDate,
              end_time: parsedEndTime,
              url, // JSON-LD should provide absolute URLs
              organizer,
              source: this.baseUrl, // Main /events/ page
              category: eventData.eventCategory || 'Various',
              location: locationString,
              venue,
              address: fullAddress.trim(),
              image_url: imageUrl,
              tags,
              price: isFree && !priceText.toLowerCase().includes('free') ? 'Free' : priceText,
              is_free: isFree ? 1 : 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            allEvents.push(event);
          } else {
            console.warn(`[VisitHamiltonCountyEventsScraper] Skipped event due to missing essential JSON-LD data (title, url, or start_date):`, eventData.name);
          }
        } catch (e: any) {
          console.error(`[VisitHamiltonCountyEventsScraper] Error parsing individual JSON-LD event: ${e.message}`, eventData, e.stack);
        }
      }
    } else {
      console.log('[VisitHamiltonCountyEventsScraper] No JSON-LD events found on the main events page. Cheerio fallback for event list page not implemented in this step.');
      // TODO: If JSON-LD from main page is not sufficient, implement Cheerio to find individual event links
      // and then call a parseEventPage(url) method that uses extractJsonLd on the detail page.
    }
    
    console.log(`[VisitHamiltonCountyEventsScraper] Scraped ${allEvents.length} events.`);
    return events;
  }
}
