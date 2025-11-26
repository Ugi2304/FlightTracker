import React from 'react';
import { FlightData } from '../types';
import { Plane, Clock, MapPin } from 'lucide-react';
import FlightStatusBadge from './FlightStatusBadge';

interface Props {
  flight: FlightData;
}

const FlightCard: React.FC<Props> = ({ flight }) => {
  const timeStr = flight.arrival.estimated 
    ? new Date(flight.arrival.estimated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date(flight.arrival.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 hover:border-blue-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
           <div className="bg-blue-50 p-2 rounded-lg">
             <Plane className="w-5 h-5 text-[#0b1c3e] transform rotate-90" />
           </div>
           <div>
             <h3 className="font-bold text-[#0b1c3e] text-lg">{flight.flight.iata || flight.flight.number}</h3>
             <p className="text-xs text-gray-500">
               {flight.airline.name}
               {flight.airline.iata && <span className="ml-1 text-gray-400 font-mono">({flight.airline.iata})</span>}
             </p>
           </div>
        </div>
        <FlightStatusBadge status={flight.flight_status} delay={flight.arrival.delay} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center text-gray-600">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          <span className="font-medium text-gray-900 truncate max-w-[200px]">
            {flight.departure.airport || flight.departure.iata}
          </span>
        </div>
        <div className="flex items-center text-gray-600">
          <Clock className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            Arrival: <span className="font-mono font-semibold text-gray-900">{timeStr}</span>
          </span>
        </div>
        <div className="flex items-center text-gray-600 text-xs mt-2 pt-2 border-t border-gray-50">
          <span className="mr-auto">
             Type: {flight.aircraft?.iata || flight.aircraft?.icao || 'N/A'}
          </span>
          {flight.arrival.terminal && (
            <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">T{flight.arrival.terminal}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlightCard;