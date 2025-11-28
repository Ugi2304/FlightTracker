import { FlightData, FlightStatus } from '../types';

export const fetchFlights = async (mode: 'arrivals' | 'departures'): Promise<FlightData[]> => {
  console.log(`Fetching real ${mode} data from Flightradar24...`);

  try {
    // We use a CORS proxy to access the public endpoint used by web clients.
    // This provides real-time schedule and status data for Zurich (ZRH).
    const PROXY_URL = 'https://corsproxy.io/?';
    // The timestamp ensures we get fresh data and don't hit cache
    const TARGET_URL = `https://api.flightradar24.com/common/v1/airport.json?code=zrh&page=1&limit=100&plugin[]=&plugin-setting[schedule][mode]=${mode}&timestamp=${Date.now()}`;
    
    const response = await fetch(PROXY_URL + encodeURIComponent(TARGET_URL));

    if (!response.ok) {
      throw new Error(`Data Provider Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Navigate the specific FR24 JSON structure based on mode
    const flightList = data?.result?.response?.airport?.pluginData?.schedule?.[mode]?.data;

    if (!flightList || !Array.isArray(flightList)) {
       console.error('Unexpected API response structure:', data);
       throw new Error('Received invalid data format from flight provider');
    }

    return flightList.map((item: any) => {
      const f = item.flight;
      
      // Map FR24 status text to our internal enum
      let statusStr = FlightStatus.SCHEDULED;
      const rawStatus = (f.status?.text || '').toLowerCase();
      
      if (rawStatus.includes('landed')) statusStr = FlightStatus.LANDED;
      else if (rawStatus.includes('cancelled')) statusStr = FlightStatus.CANCELLED;
      else if (rawStatus.includes('diverted')) statusStr = FlightStatus.DIVERTED;
      else if (rawStatus.includes('estimated') || rawStatus.includes('delayed') || rawStatus.includes('active') || rawStatus.includes('departed')) statusStr = FlightStatus.ACTIVE;
      
      // ARRIVAL TIMES
      const scheduledArr = (f.time?.scheduled?.arrival || 0) * 1000;
      const estimatedArr = (f.time?.estimated?.arrival || f.time?.other?.eta || scheduledArr) * 1000;
      const actualArr = f.time?.real?.arrival ? f.time.real.arrival * 1000 : null;
      
      // DEPARTURE TIMES
      const scheduledDep = (f.time?.scheduled?.departure || 0) * 1000;
      const estimatedDep = (f.time?.estimated?.departure || scheduledDep) * 1000;
      const actualDep = f.time?.real?.departure ? f.time.real.departure * 1000 : null;

      // Calculate Arrival Delay (if estimated is later than scheduled)
      const delayArrMinutes = (estimatedArr > scheduledArr) 
        ? Math.round((estimatedArr - scheduledArr) / 60000) 
        : null;

      // Calculate Departure Delay
      const delayDepMinutes = (estimatedDep > scheduledDep) 
        ? Math.round((estimatedDep - scheduledDep) / 60000) 
        : null;

      // Prioritize City Name for Origin & Destination
      const originName = f.airport?.origin?.position?.region?.city 
        || f.airport?.origin?.name 
        || f.airport?.origin?.code?.iata;
        
      const destName = f.airport?.destination?.position?.region?.city 
        || f.airport?.destination?.name 
        || f.airport?.destination?.code?.iata;

      return {
        flight_date: new Date(scheduledDep || scheduledArr).toISOString().split('T')[0],
        flight_status: statusStr,
        departure: {
          airport: originName || 'Unknown Origin',
          timezone: f.airport?.origin?.timezone?.name || 'UTC',
          iata: f.airport?.origin?.code?.iata || '',
          icao: f.airport?.origin?.code?.icao || '',
          terminal: f.airport?.origin?.info?.terminal || null,
          gate: f.airport?.origin?.info?.gate || null,
          delay: delayDepMinutes, 
          scheduled: new Date(scheduledDep).toISOString(),
          estimated: new Date(estimatedDep).toISOString(),
          actual: actualDep ? new Date(actualDep).toISOString() : null,
          estimated_runway: null,
          actual_runway: null
        },
        arrival: {
          airport: destName || 'Unknown Destination',
          timezone: f.airport?.destination?.timezone?.name || 'UTC',
          iata: f.airport?.destination?.code?.iata || '',
          icao: f.airport?.destination?.code?.icao || '',
          terminal: f.airport?.destination?.info?.terminal || null,
          gate: f.airport?.destination?.info?.gate || null,
          baggage: f.airport?.destination?.info?.baggage || null,
          delay: delayArrMinutes,
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