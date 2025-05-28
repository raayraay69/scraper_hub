import { BaseScraper } from './base_scraper';
import { EventListing } from '@app-types';

// Helper function to parse date and time from text
// This will be very basic and might need significant improvement
function parseDateTime(text: string, currentYear: number, currentMonthStr: string): { startDate: string, startTime?: string, descriptionLines: string[] } {
  const dateRegex = /(\d{2})\/(\d{2})/; // Matches MM/DD or DD/MM - assuming MM/DD for now
  const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s*(?:a\.m\.|p\.m\.|am|pm)|(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.|am|pm)))/i;

  let startDate = '';
  let startTime : string | undefined = undefined;
  const descriptionLines: string[] = [];

  const lines = text.split('\n');
  const dateLine = lines[0] || ''; // First line usually has date and title

  const dateMatch = dateLine.match(dateRegex);
  if (dateMatch) {
    // Assuming the MD file uses current year if not specified
    // And month is derived from section headers like "**APRIL**"
    // For now, let's try to get month from dateMatch[1] and day from dateMatch[2]
    // This needs to be more robust by passing currentMonth from the main parsing loop
    const month = parseInt(dateMatch[1], 10);
    const day = parseInt(dateMatch[2], 10);
    startDate = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  for (const line of lines) {
    const timeMatch = line.match(timeRegex);
    if (timeMatch && !startTime) { // Take the first time found
      startTime = timeMatch[0].trim();
    }
    // Simplistic way to gather description lines, excluding the main date/title line
    if (!line.match(dateRegex) || !line.startsWith('**')) {
        descriptionLines.push(line.replace(/\*\[.*?\]\(.*?\)\*/g, '').trim()); // Remove markdown links for cleaner description
    }
  }

  return { startDate, startTime, descriptionLines };
}

export class NoblesvilleGovEventsScraper extends BaseScraper {
  constructor() {
    super('City of Noblesville', 'https://www.noblesville.in.gov/');
  }

  public async scrape(_maxPages?: number, env?: any): Promise<EventListing[]> {
    const events: EventListing[] = [];
    // const filePath = path.join(__dirname, '../../../../scraped_events/noblesville_in_gov_events.md'); // Removed
    const currentYear = new Date().getFullYear(); // Use current year for events
    let currentMonthStr = '';

    try {
      const fileContent = await env.ASSETS.fetch(new URL('/scraped_events/noblesville_in_gov_events.md', this.baseUrl)).then((res: Response) => res.text());
      if (!fileContent || typeof fileContent !== 'string') {
        console.error('[NoblesvilleGovEventsScraper] Markdown content not found or not a string.');
        return [];
      }


      const contentLines = (fileContent as string).split(/\r?\n/);
      let currentEventBuffer: string[] = [];

      for (const line of contentLines) {
        if (line.startsWith('**') && (line.includes('JANUARY') || line.includes('FEBRUARY') || line.includes('MARCH') || line.includes('APRIL') || line.includes('MAY') || line.includes('JUNE') || line.includes('JULY') || line.includes('AUGUST') || line.includes('SEPTEMBER') || line.includes('OCTOBER') || line.includes('NOVEMBER') || line.includes('DECEMBER'))) {
            currentMonthStr = line.replace(/\*\*/g, '').trim();
            if (currentEventBuffer.length > 0) {
                // Process previous event
                // This logic needs to be inside the loop effectively
            }
            currentEventBuffer = []; // Reset for month header
            continue;
        }

        if (line.startsWith('**') && line.includes('—')) { // Likely start of a new event
          if (currentEventBuffer.length > 0) {
            // Process the completed event block
            const eventText = currentEventBuffer.join('\n');
            const titleMatch = eventText.match(/—\s*(.*?)(?=\n|$)/);
            const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : 'Untitled Event';

            const urlMatch = eventText.match(/\[(.*?)\]\((.*?)\)/);
            const eventUrl = urlMatch ? urlMatch[2] : undefined;
            const organizer = urlMatch ? urlMatch[1] : this.companyName;


            const { startDate, startTime, descriptionLines } = parseDateTime(eventText, currentYear, currentMonthStr);
            let description = descriptionLines.join(' ').trim();
            description = description.replace(title, '').trim(); // Remove title from description if it got included

            if (startDate && title !== 'Untitled Event') {
              const event: EventListing = {
                title,
                description: description || '', 
                start_date: startDate,
                start_time: startTime, // Corrected: use startTime directly (it's string | undefined)
                end_date: '', 
                end_time: '', 
                url: eventUrl || '', 
                organizer, 
                source: this.baseUrl,
                category: 'Community', 
                location: 'Noblesville, IN', 
                venue: '', 
                address: '', 
                image_url: '', 
                tags: '', 
                price: '', 
                is_free: 0, 
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              if (description && description.toLowerCase().includes('free')) {
                event.is_free = 1;
              }
              events.push(event);
            }
          }
          currentEventBuffer = [line]; // Start new event block
        } else if (currentEventBuffer.length > 0) {
          currentEventBuffer.push(line); // Add to current event block
        }
      }
      // Process the last event in the buffer
      if (currentEventBuffer.length > 0) {
        const eventText = currentEventBuffer.join('\n');
        const titleMatch = eventText.match(/—\s*(.*?)(?=\n|$)/);
        const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : 'Untitled Event';

        const urlMatch = eventText.match(/\[(.*?)\]\((.*?)\)/);
        const eventUrl = urlMatch ? urlMatch[2] : undefined;
        const organizer = urlMatch ? urlMatch[1] : this.companyName;

        const { startDate, startTime, descriptionLines } = parseDateTime(eventText, currentYear, currentMonthStr);
        let description = descriptionLines.join(' ').trim();
        description = description.replace(title, '').trim();

        if (startDate && title !== 'Untitled Event') {
          const event: EventListing = {
            title,
            description: description || '', 
            start_date: startDate,
            start_time: startTime, // Corrected: use startTime directly (it's string | undefined)
            end_date: '', 
            end_time: '', 
            url: eventUrl || '', 
            organizer, 
            source: this.baseUrl,
            category: 'Community',
            location: 'Noblesville, IN',
            venue: '', 
            address: '', 
            image_url: '', 
            tags: '', 
            price: '', 
            is_free: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          if (description && description.toLowerCase().includes('free')) {
            event.is_free = 1;
          }
          events.push(event);
        }
      }

    } catch (error) {
      console.error(`[NoblesvilleGovEventsScraper] Error processing events:`, error);
      // Return empty array or throw, depending on desired error handling
    }

    console.log(`[NoblesvilleGovEventsScraper] Scraped ${events.length} events.`);
    return events;
  }
}
