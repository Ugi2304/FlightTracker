import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FlightData } from '../types';

interface Props {
  flights: FlightData[];
}

const MapView: React.FC<Props> = ({ flights }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize Map centered on Zurich Airport (ZRH)
    const map = L.map(mapRef.current).setView([47.4582, 8.5555], 9);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add a marker for ZRH airport
    const airportIcon = L.divIcon({
        html: `<div class="bg-red-600 text-white rounded-full p-1 w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white font-bold text-xs">ZRH</div>`,
        className: 'bg-transparent border-none',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    L.marker([47.4582, 8.5555], { icon: airportIcon }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const currentMarkers = markersRef.current;
    const validFlightIds = new Set<string>();
    
    // Filter flights that have live location data
    const activeFlights = flights.filter(f => f.live && f.live.latitude && f.live.longitude);

    activeFlights.forEach(flight => {
      if (!flight.live) return;
      
      const id = flight.flight.iata || flight.flight.number;
      validFlightIds.add(id);
      
      const lat = flight.live.latitude;
      const lng = flight.live.longitude;
      const dir = flight.live.direction || 0;
      const altitude = flight.live.altitude || 0;

      // Create custom rotated plane icon
      const planeHtml = `
        <div style="transform: rotate(${dir - 45}deg); width: 32px; height: 32px; transition: transform 0.5s ease;">
          <svg viewBox="0 0 24 24" fill="#dc2626" stroke="white" stroke-width="1" class="w-8 h-8 drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        html: planeHtml,
        className: 'bg-transparent border-none',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const popupContent = `
        <div class="font-sans min-w-[150px]">
            <div class="flex items-center justify-between border-b pb-1 mb-2">
                <span class="font-bold text-gray-900">${id}</span>
                <span class="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium">Live</span>
            </div>
            <div class="text-sm text-gray-700 mb-1">
                <span class="text-gray-500">Airline:</span> ${flight.airline.name}
            </div>
             <div class="text-sm text-gray-700 mb-1">
                <span class="text-gray-500">From:</span> ${flight.departure.airport || flight.departure.iata}
            </div>
            <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t text-xs text-gray-500">
                <div>
                    <span class="block text-gray-400">Altitude</span>
                    <span class="font-mono text-gray-900">${Math.round(altitude)}m</span>
                </div>
                <div>
                    <span class="block text-gray-400">Speed</span>
                    <span class="font-mono text-gray-900">${Math.round(flight.live.speed_horizontal || 0)} km/h</span>
                </div>
            </div>
        </div>
      `;

      if (currentMarkers[id]) {
        // Update existing marker
        const marker = currentMarkers[id];
        marker.setLatLng([lat, lng]);
        marker.setIcon(icon);
        if (marker.getPopup()) {
           marker.setPopupContent(popupContent);
        }
      } else {
        // Create new marker
        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(popupContent);
        
        currentMarkers[id] = marker;
      }
    });

    // Remove old markers for flights no longer present/active
    Object.keys(currentMarkers).forEach(id => {
      if (!validFlightIds.has(id)) {
        currentMarkers[id].remove();
        delete currentMarkers[id];
      }
    });

  }, [flights]);

  return (
    <div className="relative w-full h-[600px] rounded-xl shadow-sm border border-gray-200 overflow-hidden bg-slate-100">
       <div ref={mapRef} className="absolute inset-0 z-0" />
       {flights.filter(f => f.live).length === 0 && (
         <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm text-xs text-gray-500 border border-gray-200">
            No live flight positions currently available
         </div>
       )}
    </div>
  );
};

export default MapView;