import { FlightData, FlightStatus } from '../types';

export const fetchArrivals = async (): Promise<FlightData[]> => {
  console.log('Fetching real flight data from Flightradar24...');

  try {
    // We use a CORS proxy to access the public endpoint used by web clients.
    // This provides real-time schedule and status data for Zurich (ZRH).
    const PROXY_URL = 'https://corsproxy.io/?';
    // The timestamp ensures we get fresh data and don't hit cache
    const TARGET_URL = `https://api.flightradar24.com/common/v1/airport.json?code=zrh&page=1&limit=100&plugin[]=&plugin-setting[schedule][mode]=arrivals&timestamp=${Date.now()}`;
    
    const response = await fetch(PROXY_URL + encodeURIComponent(TARGET_URL));

    if (!response.ok) {
      throw new Error(`Data Provider Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Navigate the specific FR24 JSON structure
    const arrivals = data?.result?.response?.airport?.pluginData?.schedule?.arrivals?.data;

    if (!arrivals || !Array.isArray(arrivals)) {
       console.error('Unexpected API response structure:', data);
       throw new Error('Received invalid data format from flight provider');
    }

    return arrivals.map((item: any) => {
      const f = item.flight;
      
      // Map FR24 status text to our internal enum
      let statusStr = FlightStatus.SCHEDULED;
      const rawStatus = (f.status?.text || '').toLowerCase();
      
      if (rawStatus.includes('landed')) statusStr = FlightStatus.LANDED;
      else if (rawStatus.includes('cancelled')) statusStr = FlightStatus.CANCELLED;
      else if (rawStatus.includes('diverted')) statusStr = FlightStatus.DIVERTED;
      else if (rawStatus.includes('estimated') || rawStatus.includes('delayed') || rawStatus.includes('active')) statusStr = FlightStatus.ACTIVE;
      
      // Timestamps from API are in seconds, convert to ms
      const scheduledArr = (f.time?.scheduled?.arrival || 0) * 1000;
      const estimatedArr = (f.time?.estimated?.arrival || f.time?.other?.eta || scheduledArr) * 1000;
      const actualArr = f.time?.real?.arrival ? f.time.real.arrival * 1000 : null;
      
      // Calculate Delay (if estimated is later than scheduled)
      const delayMinutes = (estimatedArr > scheduledArr) 
        ? Math.round((estimatedArr - scheduledArr) / 60000) 
        : null;

      // Prioritize City Name for Origin (e.g. "Barcelona" instead of "BCN")
      // Structure: airport -> origin -> position -> region -> city
      const originName = f.airport?.origin?.position?.region?.city 
        || f.airport?.origin?.name 
        || f.airport?.origin?.code?.iata;

      return {
        flight_date: new Date(scheduledArr).toISOString().split('T')[0],
        flight_status: statusStr,
        departure: {
          airport: originName || 'Unknown Origin',
          timezone: f.airport?.origin?.timezone?.name || 'UTC',
          iata: f.airport?.origin?.code?.iata || '',
          icao: f.airport?.origin?.code?.icao || '',
          terminal: f.airport?.origin?.info?.terminal || null,
          gate: f.airport?.origin?.info?.gate || null,
          delay: null, 
          scheduled: new Date((f.time?.scheduled?.departure || 0) * 1000).toISOString(),
          estimated: new Date((f.time?.estimated?.departure || 0) * 1000).toISOString(),
          actual: f.time?.real?.departure ? new Date(f.time.real.departure * 1000).toISOString() : null,
          estimated_runway: null,
          actual_runway: null
        },
        arrival: {
          airport: 'Zurich',
          timezone: 'Europe/Zurich',
          iata: 'ZRH',
          icao: 'LSZH',
          terminal: f.airport?.destination?.info?.terminal || null,
          gate: f.airport?.destination?.info?.gate || null,
          baggage: f.airport?.destination?.info?.baggage || null,
          delay: delayMinutes,
          scheduled: new Date(scheduledArr).toISOString(),
          estimated: new Date(estimatedArr).toISOString(),
          actual: actualArr ? new Date(actualArr).toISOString() : null,
          estimated_runway: null,
          actual_runway: null
        },
        airline: {
          name: f.airline?.name || 'Unknown Airline',
          iata: f.airline?.code?.iata || '',
          icao: f.airline?.code?.icao || ''
        },
        flight: {
          number: f.identification?.number?.default || '',
          iata: f.identification?.number?.default || '',
          icao: '',
          codeshared: f.identification?.codeshare || null
        },
        aircraft: {
          registration: f.aircraft?.registration || '',
          iata: f.aircraft?.model?.code || '',
          icao: '',
          icao24: ''
        },
        live: null // The schedule endpoint does not provide live telemetry
      };
    });

  } catch (err) {
    console.error('Detailed Fetch Error:', err);
    throw err;
  }
};