import React, { useEffect, useState } from 'react';
import { Prospect, UserStatus } from '../types';
import { getProspects, updateProspectStatus, deleteProspect } from '../services/storageService';

export const CRM: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [sortOrder, setSortOrder] = useState<'score' | 'date'>('score');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = getProspects();
    setProspects(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce prospect ?")) {
      deleteProspect(id);
      loadData();
    }
  };

  const handleStatusChange = (id: string, newStatus: UserStatus) => {
    updateProspectStatus(id, newStatus);
    loadData();
  };

  const sortedProspects = [...prospects].sort((a, b) => {
    if (sortOrder === 'score') {
      return (b.ai_insight?.score || 0) - (a.ai_insight?.score || 0);
    }
    return b.createdAt - a.createdAt;
  });

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'New': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Contacted': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Signed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Ignored': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Mes Prospects</h2>
              <p className="text-gray-400 mt-1">{prospects.length} entreprises enregistrées</p>
            </div>
            
            <div className="flex gap-2 bg-surface p-1 rounded-lg border border-gray-700">
                <button 
                  onClick={() => setSortOrder('score')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${sortOrder === 'score' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                   Trier par Score IA
                </button>
                <button 
                  onClick={() => setSortOrder('date')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${sortOrder === 'date' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                   Trier par Date
                </button>
            </div>
        </div>

        {/* Table/List */}
        <div className="bg-surface border border-gray-800 rounded-xl overflow-hidden shadow-xl">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-gray-900/50 text-gray-400 text-sm uppercase tracking-wider border-b border-gray-800">
                 <th className="p-4 font-medium">Entreprise</th>
                 <th className="p-4 font-medium">Score IA</th>
                 <th className="p-4 font-medium w-1/3">Stratégie (Extrait)</th>
                 <th className="p-4 font-medium">Statut</th>
                 <th className="p-4 font-medium text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-800">
               {sortedProspects.map((p) => (
                 <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                   <td className="p-4">
                     <div className="font-bold text-gray-200 text-lg">{p.business_data.name}</div>
                     <div className="text-sm text-gray-500 flex gap-2 items-center mt-1">
                        {p.business_data.website ? (
                            <a href={p.business_data.website} target="_blank" className="hover:text-primary transition-colors hover:underline">
                                {p.business_data.website.replace(/^https?:\/\//, '')}
                            </a>
                        ) : 'Pas de site'}
                        <span>•</span>
                        <span>{p.business_data.phone || 'Pas de tel'}</span>
                     </div>
                   </td>
                   
                   <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${
                            (p.ai_insight?.score || 0) > 70 ? 'text-success' : 
                            (p.ai_insight?.score || 0) > 40 ? 'text-warning' : 'text-red-400'
                        }`}>
                            {p.ai_insight?.score || 0}
                        </span>
                        <span className="text-gray-600 text-xs">/100</span>
                      </div>
                   </td>
                   
                   <td className="p-4">
                     <p className="text-sm text-gray-300 line-clamp-2" title={p.ai_insight?.suggested_offer}>
                        {p.ai_insight?.suggested_offer || "Pas d'analyse disponible"}
                     </p>
                   </td>
                   
                   <td className="p-4">
                     <select 
                        value={p.user_status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value as UserStatus)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border bg-transparent cursor-pointer outline-none focus:ring-2 ring-primary/50 ${getStatusColor(p.user_status)}`}
                     >
                       <option value="New" className="bg-surface text-gray-300">Nouveau</option>
                       <option value="Contacted" className="bg-surface text-gray-300">Contacté</option>
                       <option value="Signed" className="bg-surface text-gray-300">Signé</option>
                       <option value="Ignored" className="bg-surface text-gray-300">Ignoré</option>
                     </select>
                   </td>
                   
                   <td className="p-4 text-right">
                     <button 
                       onClick={() => handleDelete(p.id)}
                       className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                       title="Supprimer"
                     >
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                   </td>
                 </tr>
               ))}
               
               {sortedProspects.length === 0 && (
                   <tr>
                       <td colSpan={5} className="p-10 text-center text-gray-500">
                           Aucun prospect enregistré. Allez dans l'onglet "Exploration" pour en trouver.
                       </td>
                   </tr>
               )}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};