import React, { useState, useCallback } from 'react';
import { SearchResult, Prospect, UserStatus } from '../types';
import { searchBusinesses, analyzeProspect } from '../services/geminiService';
import { BusinessCard } from './BusinessCard';
import { AnalysisModal } from './AnalysisModal';
import { saveProspect } from '../services/storageService';

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

  // Mock Map Visualization (Dots on a grid)
  // Since we don't have a real map provider key for this demo.
  const MapVisual = useCallback(() => {
     return (
        <div className="w-full h-full bg-[#111] relative overflow-hidden rounded-xl border border-gray-800 group">
             {/* Decorative Grid */}
             <div className="absolute inset-0 opacity-20" style={{ 
                 backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                 backgroundSize: '40px 40px'
             }}></div>
             
             {/* Center Label */}
             <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-xs px-2 py-1 rounded border border-gray-700 text-gray-400">
                Visualisation Gemini Grounding
             </div>

             {/* Points */}
             {results.map((res) => {
                 // Generate deterministic pseudo-random position based on lat/lng decimals for visual demo
                 // Real app would use a library like 'pigeon-maps' or Google Maps JS API
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
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-700">
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
             
             {isSearching && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                     <div className="text-primary animate-pulse font-medium">Recherche géolocalisée en cours...</div>
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
                    {isSearching ? 'Recherche...' : 'Rechercher sur Maps'}
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
         <MapVisual />
         
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
                         Voir sur Google Maps
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