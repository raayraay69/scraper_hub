import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

def format_date(date_string, source_format):
    """
    Helper function to parse and reformat date strings.
    Attempts common date formats if a specific one fails.
    """
    common_formats = [
        source_format,
        '%Y-%m-%dT%H:%M:%S.%fZ',  # ISO format with milliseconds and Z
        '%Y-%m-%dT%H:%M:%SZ',     # ISO format with Z
        '%Y-%m-%d %H:%M:%S',      # Common SQL-like format
        '%m/%d/%Y %I:%M:%S %p',   # e.g., 05/08/2025 04:50:00 AM
        '%a, %d %b %Y %H:%M:%S %Z', # RFC 822 format
        '%B %d, %Y',             # e.g., May 08, 2024
    ]
    for fmt in common_formats:
        try:
            dt_object = datetime.strptime(date_string, fmt)
            return dt_object.isoformat()
        except (ValueError, TypeError):
            continue
    return None # Return None if all parsing fails

def scrape_indystar():
    """
    Scrapes news articles from the IndyStar website.
    Note: HTML structure (selectors) can change, requiring updates to this scraper.
    """
    source_name = "IndyStar"
    # Using a general news or local news section URL. This might need adjustment.
    # It's often better to find an RSS feed if available, but direct scraping is assumed here.
    url = "https://www.indystar.com/news/local/" 
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    scraped_articles = []

    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Common patterns for article containers. This is highly site-specific.
        # These selectors are educated guesses and will likely need adjustment.
        # Example: Looking for list items within a specific type of list, or article tags.
        # Often news sites use <article> tags or <div>s with classes like 'story', 'card', 'teaser'.
        
        # Attempt 1: Common list item structure for teasers
        articles = soup.find_all('li', class_=['gnt_pr_li', 'gnt_m_flm_a_i']) # Example classes
        if not articles:
            # Attempt 2: Common div structure for teasers
            articles = soup.find_all('div', class_=['gnt_m_flm_a', 'gnt_se_ct_m_a']) # More example classes
        if not articles:
             # Attempt 3: Generic article tags
            articles = soup.find_all('article')

        for article_tag in articles:
            headline_tag = None
            link_tag = None
            summary_tag = None
            date_tag = None
            image_tag = None

            # Try to find headline and link (often an <a> tag with an <h3> or <h2> inside)
            # Common headline classes: 'gnt_m_flm_a_tl', 'gnt_se_hl'
            possible_headline_parents = article_tag.find_all(['a', 'h1', 'h2', 'h3', 'h4'])
            for parent in possible_headline_parents:
                if parent.name == 'a' and parent.has_attr('href'):
                    link_tag = parent
                    headline_text_tag = parent.find(['h1', 'h2', 'h3', 'h4', 'span'], class_=['gnt_m_flm_a_tl', 'gnt_se_hl'])
                    if headline_text_tag:
                        headline_tag = headline_text_tag
                        break
                elif parent.name in ['h1', 'h2', 'h3', 'h4']: # If headline is not directly in link
                    headline_tag = parent
                    link_in_article = article_tag.find('a', href=True) # Find any link in article
                    if link_in_article:
                         link_tag = link_in_article
                    break
            
            if not headline_tag: # Fallback if specific classes not found
                headline_tag = article_tag.find(['h2', 'h3'])
            if not link_tag: # Fallback for link
                 link_tag_candidate = article_tag.find('a', href=True)
                 if link_tag_candidate:
                     link_tag = link_tag_candidate


            # Summary: often a <p> tag with a specific class or just the first <p>
            # Common summary classes: 'gnt_m_flm_a_s', 'gnt_se_s'
            summary_tag = article_tag.find('p', class_=['gnt_m_flm_a_s', 'gnt_se_s'])
            if not summary_tag:
                summary_tag = article_tag.find('p')

            # Date: often a <time> tag or a <span>/<div> with a date-like class/attribute
            # Common date classes/attributes: 'gnt_m_flm_a_ts_fs', 'timestamp'
            date_tag = article_tag.find(['time', 'span', 'div'], attrs={'data-timestamp': True})
            if not date_tag:
                date_tag = article_tag.find(['time', 'span', 'div'], class_=['gnt_m_flm_a_ts_fs', 'timestamp'])

            # Image: often an <img> tag, sometimes within a <figure>
            # Common image classes: 'gnt_m_flm_a_i_i', 'gnt_se_i_i'
            image_container = article_tag.find('img') # Simplified, might need to look for specific classes or lazy-loaded images
            if image_container and image_container.has_attr('src'):
                image_tag = image_container


            headline = headline_tag.get_text(strip=True) if headline_tag else None
            article_url = link_tag['href'] if link_tag and link_tag.has_attr('href') else None
            summary = summary_tag.get_text(strip=True) if summary_tag else None
            
            raw_date_string = None
            if date_tag:
                if date_tag.has_attr('data-timestamp'):
                    # Timestamps are often in milliseconds or seconds
                    try:
                        ts = int(date_tag['data-timestamp'])
                        if ts > 10**12: # Likely milliseconds
                            dt_object = datetime.fromtimestamp(ts / 1000)
                        else: # Likely seconds
                            dt_object = datetime.fromtimestamp(ts)
                        raw_date_string = dt_object.isoformat()
                    except ValueError:
                        raw_date_string = date_tag.get_text(strip=True) # Fallback to text
                elif date_tag.name == 'time' and date_tag.has_attr('datetime'):
                    raw_date_string = date_tag['datetime']
                else:
                    raw_date_string = date_tag.get_text(strip=True)
            
            # Ensure URL is absolute
            if article_url and not article_url.startswith('http'):
                base_url = "https://www.indystar.com"
                article_url = base_url + article_url if article_url.startswith('/') else base_url + '/' + article_url

            image_url = image_tag['src'] if image_tag and image_tag.has_attr('src') else None
            if image_url and not image_url.startswith('http') and image_tag.has_attr('data-src'): # Check for lazy loading
                 image_url = image_tag['data-src']

            if headline and article_url:
                scraped_articles.append({
                    "headline": headline,
                    "source": source_name,
                    "url": article_url,
                    "publication_date": format_date(raw_date_string, '%Y-%m-%dT%H:%M:%S%z') if raw_date_string else None, # Use None if date is N/A
                    "summary": summary,
                    "image_url": image_url,
                    "categories": [] # Placeholder for now
                })
        
        return scraped_articles

    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL {url}: {e}")
        return []
    except Exception as e:
        print(f"An error occurred during scraping {source_name}: {e}")
        return []

if __name__ == "__main__":
    print(f"Scraping news from IndyStar...")
    indystar_articles = scrape_indystar()
    
    if indystar_articles:
        print(f"\n--- IndyStar Articles ({len(indystar_articles)}) ---")
        for article in indystar_articles:
            print(json.dumps(article, indent=2))
    else:
        print("No articles found or error during scraping IndyStar.")

    # TODO: Implement scrapers for WTHR, IBJ, indy.gov, in.gov
    # For example:
    # print("\nScraping news from WTHR...")
    # wthr_articles = scrape_wthr() # To be implemented
    # if wthr_articles:
    #     print(f"\n--- WTHR Articles ({len(wthr_articles)}) ---")
    #     for article in wthr_articles:
    #         print(json.dumps(article, indent=2))
