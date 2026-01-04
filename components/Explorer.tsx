import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SearchResult, Prospect } from '../types';
import { searchBusinesses, analyzeProspect } from '../services/geminiService';
import { BusinessCard } from './BusinessCard';
import { AnalysisModal } from './AnalysisModal';
import { saveProspect } from '../services/storageService';

// Déclaration globale pour Google Maps
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export const Explorer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Paris');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  
  // Analysis State
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<any>(null);

  // Maps State
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hasMapsKey = !!process.env.GOOGLE_MAPS_API_KEY;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !location) return;
    
    setIsSearching(true);
    setResults([]);
    setSelectedResult(null);
    
    // Combine for the prompt
    const fullQuery = `${query} à ${location}`;
    const data = await searchBusinesses(fullQuery);
    
    setResults(data);
    setIsSearching(false);
  };

  const handleAnalyze = async (result: SearchResult) => {
    setSelectedResult(result);
    setShowAnalysis(true);
    setIsAnalyzing(true);
    setCurrentInsight(null);

    const insight = await analyzeProspect(result.business_data);
    
    setCurrentInsight(insight);
    setIsAnalyzing(false);
  };

  const handleSaveProspect = () => {
    if (!selectedResult || !currentInsight) return;

    const newProspect: Prospect = {
        id: crypto.randomUUID(),
        business_data: selectedResult.business_data,
        location: selectedResult.location,
        ai_insight: currentInsight,
        user_status: 'New',
        createdAt: Date.now()
    };

    saveProspect(newProspect);
    setShowAnalysis(false);
    alert("Prospect sauvegardé dans le CRM !");
  };

  // --- Google Maps Integration ---
  
  // Chargement du script Google Maps
  useEffect(() => {
    if (!hasMapsKey) return;
    if (window.google?.maps) return; // Déjà chargé

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
        initMap();
    };

    return () => {
        // Cleanup if needed
    };
  }, [hasMapsKey]);

  // Initialisation de la carte
  const initMap = () => {
      if (!mapRef.current || !window.google) return;
      
      googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 48.8566, lng: 2.3522 },
          zoom: 12,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            {
              featureType: "administrative.locality",
              elementType: "labels.text.fill",
              stylers: [{ color: "#d59563" }],
            },
            {
              featureType: "poi",
              elementType: "labels.text.fill",
              stylers: [{ color: "#d59563" }],
            },
            {
              featureType: "poi.park",
              elementType: "geometry",
              stylers: [{ color: "#263c3f" }],
            },
            {
              featureType: "poi.park",
              elementType: "labels.text.fill",
              stylers: [{ color: "#6b9a76" }],
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#38414e" }],
            },
            {
              featureType: "road",
              elementType: "geometry.stroke",
              stylers: [{ color: "#212a37" }],
            },
            {
              featureType: "road",
              elementType: "labels.text.fill",
              stylers: [{ color: "#9ca5b3" }],
            },
            {
              featureType: "road.highway",
              elementType: "geometry",
              stylers: [{ color: "#746855" }],
            },
            {
              featureType: "road.highway",
              elementType: "geometry.stroke",
              stylers: [{ color: "#1f2835" }],
            },
            {
              featureType: "road.highway",
              elementType: "labels.text.fill",
              stylers: [{ color: "#f3d19c" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#17263c" }],
            },
            {
              featureType: "water",
              elementType: "labels.text.fill",
              stylers: [{ color: "#515c6d" }],
            },
            {
              featureType: "water",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#17263c" }],
            },
          ],
          disableDefaultUI: true,
          zoomControl: true,
      });
  };

  // Mise à jour des marqueurs quand les résultats changent
  useEffect(() => {
    if (!hasMapsKey || !googleMapInstance.current || !window.google) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    results.forEach(res => {
        const marker = new window.google.maps.Marker({
            position: res.location,
            map: googleMapInstance.current,
            title: res.business_data.name,
            animation: window.google.maps.Animation.DROP,
        });

        marker.addListener('click', () => {
            setSelectedResult(res);
        });

        markersRef.current.push(marker);
        bounds.extend(res.location);
    });

    if (results.length > 0) {
        googleMapInstance.current.fitBounds(bounds);
        // Avoid zooming in too much if only 1 result
        if (results.length === 1) {
            googleMapInstance.current.setZoom(15);
        }
    }

  }, [results, hasMapsKey]);

  // Pan to selected result
  useEffect(() => {
     if (!hasMapsKey || !googleMapInstance.current || !selectedResult) return;
     googleMapInstance.current.panTo(selectedResult.location);
     googleMapInstance.current.setZoom(16);
  }, [selectedResult, hasMapsKey]);


  // --- Fallback Visual (Mock) ---
  const MapVisual = useCallback(() => {
     return (
        <div className="w-full h-full bg-[#111] relative overflow-hidden rounded-xl border border-gray-800 group">
             {/* Decorative Grid */}
             <div className="absolute inset-0 opacity-20" style={{ 
                 backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                 backgroundSize: '40px 40px'
             }}></div>
             
             {/* Center Label */}
             <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 z-10">
                Mode: Visualisation Simplifiée (Ajoutez VITE_GOOGLE_MAPS_API_KEY pour la vue réelle)
             </div>

             {/* Points */}
             {results.map((res) => {
                 const latSeed = (res.location.lat * 1000) % 100; 
                 const lngSeed = (res.location.lng * 1000) % 100;
                 const top = Math.abs(latSeed) + '%';
                 const left = Math.abs(lngSeed) + '%';
                 
                 const isSelected = selectedResult?.source_id === res.source_id;

                 return (
                     <button
                        key={res.source_id}
                        onClick={() => setSelectedResult(res)}
                        className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 transition-all duration-300 transform hover:scale-150 z-10
                            ${isSelected ? 'bg-primary border-white scale-125 shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'bg-surface border-primary/50 hover:bg-primary'}
                        `}
                        style={{ top, left }}
                        title={res.business_data.name}
                     >
                        {isSelected && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-700 z-20">
                                {res.business_data.name}
                            </div>
                        )}
                     </button>
                 );
             })}

             {results.length === 0 && !isSearching && (
                 <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                     <p>Effectuez une recherche pour voir les résultats</p>
                 </div>
             )}
        </div>
     );
  }, [results, selectedResult, isSearching]);

  return (
    <div className="flex h-full">
      {/* Sidebar List */}
      <div className="w-96 flex flex-col border-r border-gray-800 bg-background z-10 shadow-xl">
        <div className="p-4 border-b border-gray-800">
            <form onSubmit={handleSearch} className="space-y-3">
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Métier / Mot-clé</label>
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ex: Boulangerie, Avocat..."
                        className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 mt-1 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Ville</label>
                    <input 
                        type="text" 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="ex: Lyon, Paris..."
                        className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 mt-1 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={isSearching}
                    className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                    {isSearching ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           <span>Recherche...</span>
                        </>
                    ) : 'Rechercher sur Maps'}
                </button>
            </form>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
            {results.length > 0 ? (
                results.map((res) => (
                    <BusinessCard 
                        key={res.source_id}
                        data={res.business_data}
                        location={res.location}
                        isSelected={selectedResult?.source_id === res.source_id}
                        onClick={() => setSelectedResult(res)}
                        actionButton={
                            <button
                                onClick={(e) => { e.stopPropagation(); handleAnalyze(res); }}
                                className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
                                title="Analyser avec Gemini"
                            >
                                <span className="text-lg">✨</span>
                            </button>
                        }
                    />
                ))
            ) : (
                <div className="text-center mt-10 text-gray-500 space-y-2">
                    <div className="text-4xl opacity-20">🗺️</div>
                    <p>Entrez une recherche pour commencer la prospection.</p>
                </div>
            )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 bg-surface p-4 relative">
         {/* Conditionnal Rendering : Real Map vs Mock */}
         {hasMapsKey ? (
            <div className="w-full h-full rounded-xl overflow-hidden border border-gray-800 relative">
                <div ref={mapRef} className="w-full h-full bg-gray-900" />
                {isSearching && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center">
                         <div className="text-primary font-bold animate-pulse">Recherche Maps en cours...</div>
                    </div>
                )}
            </div>
         ) : (
            <MapVisual />
         )}
         
         {selectedResult && (
             <div className="absolute bottom-8 left-8 right-8 bg-surface/90 backdrop-blur-md border border-gray-700 p-4 rounded-xl shadow-2xl z-20 flex justify-between items-center animate-slide-up">
                 <div>
                     <h3 className="text-xl font-bold text-white">{selectedResult.business_data.name}</h3>
                     <p className="text-gray-400">{selectedResult.business_data.address}</p>
                 </div>
                 <div className="flex gap-3">
                     <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedResult.business_data.name + ' ' + selectedResult.business_data.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                     >
                         Ouvrir G-Maps
                     </a>
                     <button
                        onClick={() => handleAnalyze(selectedResult)}
                        className="px-4 py-2 bg-accent hover:bg-violet-600 rounded-lg text-white font-medium shadow-lg shadow-accent/20 flex items-center gap-2 transition-colors"
                     >
                         <span>✨ Analyser</span>
                     </button>
                 </div>
             </div>
         )}
      </div>

      <AnalysisModal 
         isOpen={showAnalysis} 
         onClose={() => setShowAnalysis(false)}
         onSave={handleSaveProspect}
         isAnalyzing={isAnalyzing}
         insight={currentInsight}
         businessName={selectedResult?.business_data.name || ''}
      />
    </div>
  );
};