import logging
import requests
from urllib3.exceptions import NewConnectionError, MaxRetryError, ConnectTimeoutError

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s: %(message)s')

def enhanced_fetch_url(url):
    logging.debug(f"Attempting to fetch URL: {url}")
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        logging.info(f"Successfully fetched HTML from {url}")
        return response.text
    except requests.exceptions.HTTPError as http_err:
        logging.error(f"HTTP error for {url}: {http_err}")
    except (ConnectTimeoutError, requests.exceptions.Timeout) as timeout_err:
        logging.error(f"Timeout error for {url}: {timeout_err}")
    except (NewConnectionError, MaxRetryError, requests.exceptions.ConnectionError) as conn_err:
        logging.error(f"Connection error for {url}: {conn_err}")
    except Exception as e:
        logging.error(f"Unexpected error for {url}: {e}")
    return None
