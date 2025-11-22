import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchArrivals } from './services/aviationService';
import { FlightData } from './types';
import FlightCard from './components/FlightCard';
import FlightStatusBadge from './components/FlightStatusBadge';
import MapView from './components/MapView';
import { Plane, RefreshCw, AlertTriangle, Info, Search, Clock, Map as MapIcon, List as ListIcon } from 'lucide-react';

const App: React.FC = () => {
  // Store raw data from API
  const [allFlights, setAllFlights] = useState<FlightData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState<number>(2); // Default to 2 hours initially
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const loadFlights = useCallback(async () => {
    // Only show loading spinner if we don't have data yet
    if (allFlights.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchArrivals();
      setAllFlights(data);
      setLastUpdated(new Date());
    } catch (err: any) {
       console.error(err);
       setError(err.message || 'An unexpected error occurred while fetching flight data.');
    } finally {
      setLoading(false);
    }
  }, []); // Removed allFlights.length dependency to prevent loops

  useEffect(() => {
    loadFlights();
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(loadFlights, 60000);
    return () => clearInterval(interval);
  }, [loadFlights]);

  // Derive displayed flights based on time filter and search term
  const displayedFlights = useMemo(() => {
    if (!allFlights.length) return [];

    const now = new Date();
    const rangeEnd = new Date(now.getTime() + timeRange * 60 * 60 * 1000);
    const rangeStart = new Date(now.getTime() - 30 * 60 * 1000); // Keep 30 min history for "just landed"

    let filtered = allFlights.filter(flight => {
      const timeRef = flight.arrival.estimated || flight.arrival.scheduled;
      if (!timeRef) return false;
      const arrivalTime = new Date(timeRef);
      return arrivalTime >= rangeStart && arrivalTime <= rangeEnd;
    });

    // Sort by time ascending (sooner first)
    filtered.sort((a, b) => {
      const timeA = new Date(a.arrival.estimated || a.arrival.scheduled).getTime();
      const timeB = new Date(b.arrival.estimated || b.arrival.scheduled).getTime();
      return timeA - timeB;
    });

    // Apply Search Filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        (f.flight.iata || '').toLowerCase().includes(search) ||
        (f.flight.number || '').toLowerCase().includes(search) ||
        (f.departure.airport || '').toLowerCase().includes(search) ||
        (f.airline.name || '').toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [allFlights, timeRange, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
              <Plane className="text-white w-6 h-6 transform rotate-90" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">FlightTracker</h1>
              <p className="text-xs text-gray-500 font-medium">Zurich Airport</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:block text-right mr-4">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Local Time</p>
                <p className="text-lg font-mono font-bold text-gray-800">
                  {lastUpdated ? lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                </p>
             </div>
             <button 
               onClick={loadFlights}
               disabled={loading}
               className={`p-2.5 rounded-full hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all ${loading ? 'animate-spin text-red-500' : 'text-gray-600'}`}
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
            {/* Time Range Buttons */}
            <div className="flex flex-wrap gap-2">
               {[1, 3, 5].map((hours) => (
                 <button
                   key={hours}
                   onClick={() => setTimeRange(hours)}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                     timeRange === hours
                       ? 'bg-red-600 text-white border-red-600 shadow-sm'
                       : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                   }`}
                 >
                   Next {hours} {hours === 1 ? 'Hour' : 'Hours'}
                 </button>
               ))}
            </div>

            {/* View Toggle */}
             <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 self-start md:self-auto">
              <button 
                onClick={() => setViewMode('list')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ListIcon className="w-4 h-4" />
                List
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <MapIcon className="w-4 h-4" />
                Map
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex-grow lg:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm shadow-sm transition-all"
                placeholder="Search flight #, city, or airline..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </div>

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
        {loading && allFlights.length === 0 && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
              ))}
           </div>
        )}

        {/* Empty State */}
        {!loading && !error && displayedFlights.length === 0 && (
           <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No flights found</h3>
              <p className="text-gray-500 mt-1">There are no flights arriving in the next {timeRange} hours matching your criteria.</p>
           </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && displayedFlights.length > 0 && (
          <MapView flights={displayedFlights} />
        )}

        {/* List/Grid Views */}
        {viewMode === 'list' && displayedFlights.length > 0 && (
          <>
            {/* Grid View (Mobile/Tablet) */}
            <div className="block lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedFlights.map((flight, idx) => (
                <FlightCard key={`${flight.flight.iata}-${idx}`} flight={flight} />
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
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Origin</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Airline</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aircraft</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedFlights.map((flight, idx) => {
                       const timeStr = flight.arrival.estimated 
                         ? new Date(flight.arrival.estimated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                         : new Date(flight.arrival.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                       
                       return (
                        <tr key={`${flight.flight.iata}-${idx}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold font-mono text-gray-900">{timeStr}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(flight.arrival.scheduled).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">{flight.flight.iata || flight.flight.number}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">{flight.departure.airport || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{flight.departure.iata}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{flight.airline.name}</div>
                            {flight.airline.iata && <div className="text-xs text-gray-500 font-mono">{flight.airline.iata}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {flight.aircraft?.iata || flight.aircraft?.icao || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <FlightStatusBadge status={flight.flight_status} delay={flight.arrival.delay} />
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
           <p className="text-xs text-gray-400">Data provided by Aviation Stack. Real-time data may have slight delays.</p>
        </div>

      </main>
    </div>
  );
};

export default App;