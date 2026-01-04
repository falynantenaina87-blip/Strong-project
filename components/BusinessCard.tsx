import React from 'react';
import { BusinessData, Location } from '../types';

interface BusinessCardProps {
  data: BusinessData;
  location: Location;
  isSelected?: boolean;
  onClick?: () => void;
  actionButton?: React.ReactNode;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ data, location, isSelected, onClick, actionButton }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        p-4 rounded-xl border transition-all duration-200 cursor-pointer group relative overflow-hidden pb-10
        ${isSelected 
          ? 'bg-surface border-primary ring-1 ring-primary/50 shadow-lg shadow-primary/10' 
          : 'bg-surface/40 border-gray-800 hover:border-gray-700 hover:bg-surface/80'}
      `}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-14">
          <h3 className="font-semibold text-lg text-gray-100 truncate group-hover:text-primary transition-colors">
            {data.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
             {data.rating ? (
               <span className={`flex items-center ${data.rating < 4 ? 'text-red-400' : 'text-yellow-500'}`}>
                 ★ <span className="text-gray-300 ml-1">{data.rating}</span>
               </span>
             ) : (
                <span className="text-gray-600 text-xs italic">Non noté</span>
             )}
             {data.address && (
               <span className="truncate max-w-[200px]" title={data.address}>• {data.address}</span>
             )}
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
             {data.website ? (
               <a 
                href={data.website} 
                target="_blank" 
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1 text-xs rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
               >
                 Site Web
               </a>
             ) : (
                <span className="px-2 py-1 text-xs rounded-md bg-red-500/10 text-red-400 border border-red-500/20 font-medium">Pas de site</span>
             )}
             {data.phone && (
               <span className="px-2 py-1 text-xs rounded-md bg-gray-800 text-gray-400 border border-gray-700">
                 {data.phone}
               </span>
             )}
          </div>
        </div>
        
        {actionButton && (
          <div className="ml-2 flex-shrink-0 z-10">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};