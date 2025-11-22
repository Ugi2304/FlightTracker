import { FlightData } from '../types';

const API_KEY = '837c4a069d78f67e6be05a489da930f5';

export const fetchArrivals = async (): Promise<FlightData[]> => {
  try {
    // AviationStack Free Tier only supports HTTP.
    // We must use a proxy to fetch HTTP resources from an HTTPS app.
    const targetUrl = `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&arr_iata=ZRH&limit=100`;
    
    // Using corsproxy.io which is generally reliable for this purpose
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    
    console.log(`Fetching flights...`);
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
        throw new Error(`Network error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    
    // Handle AviationStack API errors (e.g. invalid key, usage limit)
    if (json.error) {
        const err = json.error;
        console.error('Aviation Stack API Error:', err);
        throw new Error(`API Error: ${err.message || err.code || 'Unknown error'}`);
    }

    if (!json.data) {
        return [];
    }

    return json.data as FlightData[];
  } catch (error) {
    console.error('Failed to fetch flights:', error);
    throw error;
  }
};