import React from 'react';
import { FlightData } from '../types';
import { Plane, Clock, MapPin } from 'lucide-react';
import FlightStatusBadge from './FlightStatusBadge';

interface Props {
  flight: FlightData;
  isDeparture: boolean;
}

const FlightCard: React.FC<Props> = ({ flight, isDeparture }) => {
  const scheduledTime = isDeparture ? flight.departure.scheduled : flight.arrival.scheduled;
  const estimatedTime = isDeparture ? flight.departure.estimated : flight.arrival.estimated;
  
  const timeStr = estimatedTime 
    ? new Date(estimatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // For departures: Show Destination. For Arrivals: Show Origin.
  const locationName = isDeparture 
    ? (flight.arrival.airport || flight.arrival.iata)
    : (flight.departure.airport || flight.departure.iata);

  const delay = isDeparture ? flight.departure.delay : flight.arrival.delay;
  const terminal = isDeparture ? flight.departure.terminal : flight.arrival.terminal;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 hover:border-blue-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
           <div className={`p-2 rounded-lg ${isDeparture ? 'bg-yellow-50' : 'bg-blue-50'}`}>
             <Plane className={`w-5 h-5 ${isDeparture ? 'text-yellow-600' : 'text-[#0b1c3e]'} transform ${isDeparture ? '-rotate-45' : 'rotate-90'}`} />
           </div>
           <div>
             <h3 className="font-bold text-[#0b1c3e] text-lg">{flight.flight.iata || flight.flight.number}</h3>
             <p className="text-xs text-gray-500">
               {flight.airline.name}
               {flight.airline.iata && <span className="ml-1 text-gray-400 font-mono">({flight.airline.iata})</span>}
             </p>
           </div>
        </div>
        <FlightStatusBadge status={flight.flight_status} delay={delay} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center text-gray-600">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-xs text-gray-400 mr-1 uppercase font-bold tracking-wider">{isDeparture ? 'To' : 'From'}:</span>
          <span className="font-medium text-gray-900 truncate max-w-[180px]">
            {locationName}
          </span>
        </div>
        <div className="flex items-center text-gray-600">
          <Clock className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            {isDeparture ? 'Departure' : 'Arrival'}: <span className="font-mono font-semibold text-gray-900">{timeStr}</span>
          </span>
        </div>
        <div className="flex items-center text-gray-600 text-xs mt-2 pt-2 border-t border-gray-50">
          <span className="mr-auto">
             Type: {flight.aircraft?.iata || flight.aircraft?.icao || 'N/A'}
          </span>
          {terminal && (
            <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">T{terminal}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlightCard;