import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SearchResult, Prospect, BusinessData } from '../types';
import { searchBusinesses, enrichWithEmail, calculateScore } from '../services/geminiService';
import { BusinessCard } from './BusinessCard';
import { saveProspect } from '../services/storageService';

// Déclaration globale pour Google Maps
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export const Explorer: React.FC = () => {
  // State Recherche
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Paris');
  const [isSearching, setIsSearching] = useState(false);
  
  // State Données
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isEnriching, setIsEnriching] = useState<Set<string>>(new Set()); // IDs en cours d'enrichissement email

  // State Filtres
  const [filterRating, setFilterRating] = useState<number | ''>('');
  const [filterNoSite, setFilterNoSite] = useState(false);
  const [minScore, setMinScore] = useState(0);

  // Maps State
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hasMapsKey = !!process.env.GOOGLE_MAPS_API_KEY;

  // --- Logic ---

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !location) return;
    
    setIsSearching(true);
    setResults([]);
    setFilteredResults([]);
    setSelectedResult(null);
    
    // Appel du service amélioré (Volume)
    const data = await searchBusinesses(query, location);
    
    // Calcul automatique du score local pour chaque résultat
    const scoredData = data.map(res => {
        const localScore = calculateScore(res.business_data);
        // On attache un score temporaire dans l'objet pour le tri
        return { ...res, _tempScore: localScore.score }; 
    });

    setResults(scoredData);
    setIsSearching(false);
  };

  // Application des filtres
  useEffect(() => {
    let filtered = [...results];

    if (filterNoSite) {
        filtered = filtered.filter(r => !r.business_data.website);
    }

    if (filterRating !== '') {
        filtered = filtered.filter(r => (r.business_data.rating || 0) <= Number(filterRating));
    }

    if (minScore > 0) {
        filtered = filtered.filter(r => (r as any)._tempScore >= minScore);
    }

    setFilteredResults(filtered);
  }, [results, filterNoSite, filterRating, minScore]);

  // Enrichissement Email (Un par un ou bouton global)
  const handleEnrichEmail = async (res: SearchResult) => {
      if (isEnriching.has(res.source_id)) return;

      setIsEnriching(prev => new Set(prev).add(res.source_id));
      
      const email = await enrichWithEmail(res.business_data);
      
      if (email) {
          // Mise à jour de la liste locale
          setResults(prev => prev.map(item => 
              item.source_id === res.source_id 
              ? { ...item, business_data: { ...item.business_data, email } }
              : item
          ));
      }

      setIsEnriching(prev => {
          const next = new Set(prev);
          next.delete(res.source_id);
          return next;
      });
  };

  const handleExportCSV = () => {
    if (filteredResults.length === 0) return;

    const headers = ['Nom', 'Adresse', 'Email', 'Téléphone', 'Site Web', 'Note', 'Score Potentiel'];
    const rows = filteredResults.map(r => [
        r.business_data.name,
        r.business_data.address || '',
        r.business_data.email || '',
        r.business_data.phone || '',
        r.business_data.website || '',
        r.business_data.rating || '',
        (r as any)._tempScore || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `prospects_${query}_${location}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToCRM = (res: SearchResult) => {
    const localInsight = calculateScore(res.business_data);
    const prospect: Prospect = {
        id: crypto.randomUUID(),
        business_data: res.business_data,
        location: res.location,
        ai_insight: { 
            ...localInsight, 
            score: localInsight.score * 10 // Remise à l'échelle 100 pour compatibilité CRM existant
        }, 
        user_status: 'New',
        createdAt: Date.now()
    };
    saveProspect(prospect);
    // Petit feedback visuel ou toast ici si besoin
  };

  // --- Google Maps Integration (Même logique qu'avant) ---
  useEffect(() => {
    if (!hasMapsKey) return;
    if (window.google?.maps) return; 

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    script.onload = () => initMap();
  }, [hasMapsKey]);

  const initMap = () => {
      if (!mapRef.current || !window.google) return;
      googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 48.8566, lng: 2.3522 },
          zoom: 12,
          disableDefaultUI: true,
          styles: [/* Dark Mode Styles */
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          ]
      });
  };

  useEffect(() => {
    if (!hasMapsKey || !googleMapInstance.current || !window.google) return;
    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    const bounds = new window.google.maps.LatLngBounds();

    filteredResults.forEach(res => {
        const marker = new window.google.maps.Marker({
            position: res.location,
            map: googleMapInstance.current,
            title: res.business_data.name,
        });
        marker.addListener('click', () => setSelectedResult(res));
        markersRef.current.push(marker);
        bounds.extend(res.location);
    });

    if (filteredResults.length > 0) {
        googleMapInstance.current.fitBounds(bounds);
    }
  }, [filteredResults, hasMapsKey]);


  // --- Render ---

  return (
    <div className="flex h-full">
      {/* Sidebar - Controls & List */}
      <div className="w-[450px] flex flex-col border-r border-gray-800 bg-background z-10 shadow-xl">
        
        {/* Search Header */}
        <div className="p-4 border-b border-gray-800 space-y-3 bg-surface/50">
            <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                    type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Métier (ex: Plombier)"
                    className="flex-1 bg-background border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                />
                <input 
                    type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ville"
                    className="w-24 bg-background border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                />
                <button type="submit" disabled={isSearching} className="bg-primary hover:bg-blue-600 px-3 rounded-lg text-white">
                    {isSearching ? '...' : '🔍'}
                </button>
            </form>

            {/* Filters Toolbar */}
            <div className="flex flex-wrap gap-2 items-center">
                <select 
                    value={filterRating} 
                    onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : '')}
                    className="bg-gray-800 text-xs text-white border border-gray-700 rounded px-2 py-1"
                >
                    <option value="">Toutes Notes</option>
                    <option value="3.5">Note &lt; 3.5</option>
                    <option value="4.0">Note &lt; 4.0</option>
                    <option value="4.5">Note &lt; 4.5</option>
                </select>

                <label className="flex items-center gap-1 cursor-pointer bg-gray-800 px-2 py-1 rounded border border-gray-700">
                    <input type="checkbox" checked={filterNoSite} onChange={(e) => setFilterNoSite(e.target.checked)} className="rounded bg-gray-700 border-gray-600" />
                    <span className="text-xs text-gray-300">Sans Site</span>
                </label>

                <div className="flex-1"></div>

                {filteredResults.length > 0 && (
                    <button 
                        onClick={handleExportCSV}
                        className="text-xs flex items-center gap-1 bg-green-600/20 text-green-400 border border-green-600/30 px-2 py-1 rounded hover:bg-green-600/30"
                    >
                        📄 CSV
                    </button>
                )}
            </div>
            
            <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{filteredResults.length} résultats trouvés</span>
                {isSearching && <span className="text-primary animate-pulse">Recherche étendue en cours...</span>}
            </div>
        </div>
        
        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-20 bg-background">
            {filteredResults.map((res) => {
                const score = (res as any)._tempScore || 0;
                const enriching = isEnriching.has(res.source_id);
                
                return (
                    <div key={res.source_id} className="relative group">
                         <BusinessCard 
                            data={res.business_data}
                            location={res.location}
                            isSelected={selectedResult?.source_id === res.source_id}
                            onClick={() => setSelectedResult(res)}
                            actionButton={
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSaveToCRM(res); }}
                                        className="p-2 rounded bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                        title="Ajouter au CRM"
                                    >
                                        + CRM
                                    </button>
                                </div>
                            }
                        />
                        {/* Overlay Score & Email Actions */}
                        <div className="absolute top-2 right-16 flex gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded border ${
                                score >= 7 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                score >= 5 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                'bg-gray-700 text-gray-400 border-gray-600'
                            }`}>
                                Score: {score}/10
                            </span>
                        </div>
                        
                        {/* Email Fetcher Bar inside card */}
                        <div className="absolute bottom-2 right-4 flex items-center gap-2">
                            {res.business_data.email ? (
                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                                    📧 {res.business_data.email}
                                </span>
                            ) : (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleEnrichEmail(res); }}
                                    disabled={enriching}
                                    className="text-xs bg-gray-800 text-gray-400 hover:text-white px-2 py-0.5 rounded border border-gray-700"
                                >
                                    {enriching ? 'Recherche email...' : '🔍 Trouver Email'}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
            
            {filteredResults.length === 0 && !isSearching && (
                <div className="text-center mt-10 text-gray-500">
                    Utilisez la recherche pour commencer.
                </div>
            )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 bg-surface relative">
         {hasMapsKey ? (
            <div ref={mapRef} className="w-full h-full bg-gray-900" />
         ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 bg-[#111]">
                <div className="text-center">
                    <p className="mb-2">Mode Grille (Sans clé API Maps JS)</p>
                    <p className="text-sm opacity-50">Les résultats sont affichés dans la liste à gauche</p>
                </div>
            </div>
         )}
      </div>
    </div>
  );
};