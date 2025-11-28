import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { fetchFlights } from './services/aviationService';
import { FlightData } from './types';
import FlightCard from './components/FlightCard';
import FlightStatusBadge from './components/FlightStatusBadge';
import { RefreshCw, AlertTriangle, Info, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const App: React.FC = () => {
  // Store raw data from API
  const [allFlights, setAllFlights] = useState<FlightData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState<number>(1); // Default to 1 hour
  const [mode, setMode] = useState<'arrivals' | 'departures'>('arrivals');
  
  // Use a ref to track if the initial load has completed.
  const hasLoadedRef = useRef(false);

  const loadFlights = useCallback(async () => {
    // Only show full loading spinner on the very first load or when switching modes manually
    if (!hasLoadedRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchFlights(mode);
      setAllFlights(data);
      setLastUpdated(new Date());
      hasLoadedRef.current = true;
    } catch (err: any) {
       console.error(err);
       setError(err.message || 'An unexpected error occurred while fetching flight data.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    // Reset loaded ref when mode changes to trigger loading state
    hasLoadedRef.current = false;
    loadFlights();
    
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(() => {
        // We don't reset hasLoadedRef here to avoid spinner on auto-refresh
        hasLoadedRef.current = true; 
        loadFlights();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadFlights]);

  // Derive displayed flights based on time filter and search term
  const displayedFlights = useMemo(() => {
    if (!allFlights.length) return [];

    const now = new Date();
    // Calculate the cut-off time based on selected range
    const rangeEnd = new Date(now.getTime() + timeRange * 60 * 60 * 1000);
    // Include flights that were relevant up to 60 mins ago for context
    const rangeStart = new Date(now.getTime() - 60 * 60 * 1000); 

    let filtered = allFlights.filter(flight => {
      // Choose reference time based on mode
      const timeRef = mode === 'arrivals' 
        ? (flight.arrival.estimated || flight.arrival.scheduled)
        : (flight.departure.estimated || flight.departure.scheduled);

      if (!timeRef) return false;
      
      const flightTime = new Date(timeRef);
      return flightTime >= rangeStart && flightTime <= rangeEnd;
    });

    // Sort by time ascending (sooner first)
    filtered.sort((a, b) => {
      const timeA = new Date(mode === 'arrivals' ? (a.arrival.estimated || a.arrival.scheduled) : (a.departure.estimated || a.departure.scheduled)).getTime();
      const timeB = new Date(mode === 'arrivals' ? (b.arrival.estimated || b.arrival.scheduled) : (b.departure.estimated || b.departure.scheduled)).getTime();
      return timeA - timeB;
    });

    // Apply Search Filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        (f.flight.iata || '').toLowerCase().includes(search) ||
        (f.flight.number || '').toLowerCase().includes(search) ||
        (f.departure.airport || '').toLowerCase().includes(search) ||
        (f.arrival.airport || '').toLowerCase().includes(search) ||
        (f.airline.name || '').toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [allFlights, timeRange, searchTerm, mode]);

  const isDeparture = mode === 'departures';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Header - Flightradar24 Style (Blue) */}
      <header className="bg-[#0b1c3e] text-white border-b border-blue-900 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Custom Logo Icon */}
            <div className="w-10 h-10 relative flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="24" fill="#1e3a8a" />
                <rect width="100" height="100" rx="24" fill="url(#grad1)" fillOpacity="0.4" />
                <defs>
                   <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                     <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                     <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
                   </linearGradient>
                </defs>
                <path d="M50 15C52.2 15 54 16.8 54 19V34L78 44V49L54 41V58L62 64V68L50 64L38 68V64L46 58V41L22 49V44L46 34V19C46 16.8 47.8 15 50 15Z" fill="white"/>
                <path d="M30 72C30 72 40 64 50 64C60 64 70 72 70 72" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round"/>
                <path d="M38 78C38 78 44 73 50 73C56 73 62 78 62 78" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round"/>
                <path d="M46 86H54L50 80L46 86Z" fill="white"/>
                <circle cx="50" cy="88" r="3" fill="white"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">UGI <span className="text-yellow-400">FlightTracker</span></h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:block text-right mr-4">
                <p className="text-[10px] text-blue-200 uppercase font-semibold tracking-wider">Zurich Local Time</p>
                <p className="text-sm font-mono font-bold text-yellow-400">
                  {lastUpdated ? lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                </p>
             </div>
             <button 
               onClick={() => { hasLoadedRef.current = false; loadFlights(); }}
               disabled={loading}
               className={`p-2 rounded-full hover:bg-blue-900 transition-all ${loading ? 'animate-spin text-yellow-400' : 'text-blue-200 hover:text-white'}`}
               title="Refresh Data"
             >
               <RefreshCw className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Controls Section */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 justify-between">
          
          <div className="flex flex-col md:flex-row gap-4">
             {/* Arrivals / Departures Switch */}
             <div className="bg-gray-200 p-1 rounded-lg flex shadow-inner">
                <button
                  onClick={() => setMode('arrivals')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    mode === 'arrivals' 
                    ? 'bg-[#0b1c3e] text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <ArrowDownRight className={`w-4 h-4 mr-2 ${mode === 'arrivals' ? 'text-green-400' : 'text-gray-500'}`} />
                  Arrivals
                </button>
                <button
                  onClick={() => setMode('departures')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    mode === 'departures' 
                    ? 'bg-[#0b1c3e] text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <ArrowUpRight className={`w-4 h-4 mr-2 ${mode === 'departures' ? 'text-yellow-400' : 'text-gray-500'}`} />
                  Departures
                </button>
             </div>

            {/* Time Range Buttons */}
            <div className="flex flex-col gap-1 justify-center">
              <div className="flex flex-wrap gap-2">
                {[1, 3, 5].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => setTimeRange(hours)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                      timeRange === hours
                        ? 'bg-[#0b1c3e] text-white border-[#0b1c3e]'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    +{hours} {hours === 1 ? 'Hour' : 'Hours'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex-grow lg:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b1c3e] focus:border-[#0b1c3e] sm:text-sm shadow-sm transition-all"
                placeholder="Search flight #, city, or airline..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </div>

        {/* Info Text */}
        {displayedFlights.length > 0 && (
           <p className="text-xs text-gray-500 mb-4 ml-1">
              Showing {displayedFlights.length} {mode} within the selected time range
           </p>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3">
             <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
             <div>
               <h3 className="text-sm font-medium text-amber-800">Unable to load flights</h3>
               <p className="text-sm text-amber-700 mt-1">{error}</p>
             </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !hasLoadedRef.current && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
              ))}
           </div>
        )}

        {/* Empty State */}
        {!loading && !error && displayedFlights.length === 0 && (
           <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No flights found</h3>
              <p className="text-gray-500 mt-1">
                There are no {mode} in the next {timeRange} hours matching your criteria.
              </p>
           </div>
        )}

        {/* List/Grid Views */}
        {displayedFlights.length > 0 && (
          <>
            {/* Grid View (Mobile/Tablet) */}
            <div className="block lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedFlights.map((flight, idx) => (
                <FlightCard 
                  key={`${flight.flight.iata}-${idx}`} 
                  flight={flight} 
                  isDeparture={isDeparture} 
                />
              ))}
            </div>

            {/* Table View (Desktop) */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Flight</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                         {isDeparture ? 'Destination' : 'Origin'}
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Airline</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aircraft</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedFlights.map((flight, idx) => {
                       const scheduledTime = isDeparture ? flight.departure.scheduled : flight.arrival.scheduled;
                       const estimatedTime = isDeparture ? flight.departure.estimated : flight.arrival.estimated;
                       
                       const timeStr = estimatedTime 
                         ? new Date(estimatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                         : new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                       
                       return (
                        <tr key={`${flight.flight.iata}-${idx}`} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold font-mono text-gray-900">{timeStr}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(scheduledTime).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-[#0b1c3e]">{flight.flight.iata || flight.flight.number}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">
                                {isDeparture ? (flight.arrival.airport || 'Unknown') : (flight.departure.airport || 'Unknown')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{flight.airline.name}</div>
                            {flight.airline.iata && <div className="text-xs text-gray-500 font-mono">{flight.airline.iata}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {flight.aircraft?.iata || flight.aircraft?.icao || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <FlightStatusBadge 
                                status={flight.flight_status} 
                                delay={isDeparture ? flight.departure.delay : flight.arrival.delay} 
                            />
                          </td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        
        <div className="mt-6 text-center">
           <p className="text-xs text-gray-400">Data Source: Flightradar24 (via Proxy). Real-time data subject to availability.</p>
        </div>

      </main>
    </div>
  );
};

export default App;