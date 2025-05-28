import { BaseScraper } from './base_scraper';
import { EventListing } from '@app-types';
// import eventbriteIndianaEventsMd from '../../../scraped_events/eventbrite_in_indiana_events_partial.md'; // Corrected path - REMOVED

// import eventbriteIndianaEventsMd from '../../../scraped_events/eventbrite_in_indiana_events_partial.md'; // Corrected path - REMOVED

// The parseEventbriteDateTime helper function is removed as it's not needed with JSON-LD parsing.

export class EventbriteIndianaEventsScraper extends BaseScraper {
  constructor() {
    super('Eventbrite Indiana', 'https://www.eventbrite.com/b/in--indianapolis/');
  }

  public async scrape(_maxPages?: number, env?: any): Promise<EventListing[]> {
    const events: EventListing[] = [];
    
    let htmlContent: string;
    try {
      htmlContent = await this.fetchHtml(this.baseUrl);
      if (!htmlContent) {
        console.error(`[EventbriteIndianaEventsScraper] HTML content not found or empty for ${this.baseUrl}.`);
        return [];
      }
    } catch (error) {
      console.error(`[EventbriteIndianaEventsScraper] Error fetching HTML from ${this.baseUrl}:`, error);
      return [];
    }

    const jsonData = this.extractJsonLd(htmlContent, 'Event'); // Prioritize 'Event' type for Eventbrite

    if (jsonData && jsonData.length > 0) {
      console.log(`[EventbriteIndianaEventsScraper] Found ${jsonData.length} JSON-LD event objects of type 'Event'.`);
      for (const eventData of jsonData) {
        try {
          const title = eventData.name || '';
          const url = eventData.url || '';
          const startDateRaw = eventData.startDate;
          const endDateRaw = eventData.endDate;
          
          let parsedStartDate = '';
          let parsedStartTime: string | undefined = undefined;
          if (startDateRaw) {
            const dateObj = new Date(startDateRaw);
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
          let locationString = 'Indiana'; // Default
          if (locationName) {
            locationString = locationName;
          } else if (addressLocality && addressRegion) {
            locationString = `${addressLocality}, ${addressRegion}`;
          } else if (addressLocality) {
            locationString = addressLocality;
          }


          const venue = locationName || (eventData.location?.address?.name) || 'Venue not specified';
          const address = eventData.location?.address?.streetAddress || '';
          
          const imageUrl = Array.isArray(eventData.image) ? eventData.image[0] : eventData.image || '';
          
          let priceText = 'Check ticket price'; // Default
          if (eventData.offers) {
            const offer = Array.isArray(eventData.offers) ? eventData.offers[0] : eventData.offers; // Handle single or array of offers
            if (offer?.price) {
              priceText = `${offer.price} ${offer.priceCurrency || ''}`.trim();
            } else if (offer?.priceSpecification?.price) {
              priceText = `${offer.priceSpecification.price} ${offer.priceSpecification.priceCurrency || ''}`.trim();
            } else if (typeof offer?.name === 'string' && offer.name.toLowerCase() !== 'free') { // Sometimes price is in offer name
                priceText = offer.name;
            }
          }
          
          const isFree = eventData.isAccessibleForFree === true || 
                         (eventData.offers && (Array.isArray(eventData.offers) ? eventData.offers : [eventData.offers]).some(o => o.price === 0 || o.price === '0' || o.name?.toLowerCase() === 'free' || o.priceSpecification?.price === 0)) ||
                         priceText.toLowerCase() === 'free';

          const organizer = eventData.organizer?.name || 'Eventbrite';
          const description = eventData.description || '';
          const keywords = eventData.keywords;
          const tags = Array.isArray(keywords) ? keywords.join(', ') : (typeof keywords === 'string' ? keywords : '');

          if (title && url && parsedStartDate) {
            const event: EventListing = {
              title,
              description,
              start_date: parsedStartDate,
              start_time: parsedStartTime,
              end_date: parsedEndDate,
              end_time: parsedEndTime,
              url,
              organizer,
              source: this.baseUrl, // Could refine to eventData.url if it's always absolute & from Eventbrite
              category: 'Various', // JSON-LD might have 'eventCategory' or use keywords
              location: locationString,
              venue,
              address,
              image_url: imageUrl,
              tags,
              price: isFree && priceText.toLowerCase() !== 'free' ? 'Free' : priceText, // Ensure 'Free' if isFree is true
              is_free: isFree ? 1 : 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            events.push(event);
          } else {
            console.warn(`[EventbriteIndianaEventsScraper] Skipped event due to missing essential data (title, url, or start_date):`, eventData.name);
          }
        } catch (e: any) {
          console.error(`[EventbriteIndianaEventsScraper] Error parsing individual JSON-LD event: ${e.message}`, eventData, e.stack);
        }
      }
    } else {
      console.log('[EventbriteIndianaEventsScraper] No JSON-LD events of type \'Event\' found, or extractJsonLd returned empty. HTML parsing fallback not implemented.');
    }

    console.log(`[EventbriteIndianaEventsScraper] Scraped ${events.length} events.`);
    return events;
  }
}
