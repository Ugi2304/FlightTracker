import React from 'react';
import { FlightStatus } from '../types';

interface Props {
  status: string;
  delay: number | null;
}

const FlightStatusBadge: React.FC<Props> = ({ status, delay }) => {
  const normalizedStatus = status.toLowerCase();
  
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';
  let label = status;

  if (normalizedStatus === FlightStatus.ACTIVE) {
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-800';
    label = 'In Air';
  } else if (normalizedStatus === FlightStatus.LANDED) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
    label = 'Landed';
  } else if (normalizedStatus === FlightStatus.CANCELLED) {
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
    label = 'Cancelled';
  } else if (normalizedStatus === FlightStatus.SCHEDULED) {
    bgColor = 'bg-emerald-50';
    textColor = 'text-emerald-700';
    label = 'On Time';
  }

  // Override for delay
  if (delay && delay > 15 && normalizedStatus !== FlightStatus.CANCELLED && normalizedStatus !== FlightStatus.LANDED) {
     bgColor = 'bg-amber-100';
     textColor = 'text-amber-800';
     label = `Delayed (+${delay}m)`;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor} border border-opacity-20 border-current`}>
      {label.toUpperCase()}
    </span>
  );
};

export default FlightStatusBadge;
