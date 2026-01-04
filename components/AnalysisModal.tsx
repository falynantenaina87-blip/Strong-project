import React from 'react';
import { AIInsight, BusinessData } from '../types';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isAnalyzing: boolean;
  insight: AIInsight | null;
  businessName: string;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ 
  isOpen, onClose, onSave, isAnalyzing, insight, businessName 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-accent">✨</span> Analyse IA : {businessName}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 animate-pulse">Gemini analyse le potentiel de ce prospect...</p>
            </div>
          ) : insight ? (
            <div className="space-y-6">
              {/* Score */}
              <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <span className="text-gray-400">Score de Potentiel</span>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-white">{insight.score}<span className="text-gray-500 text-lg">/100</span></div>
                  <div className={`w-3 h-3 rounded-full ${insight.score > 70 ? 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)]' : insight.score > 40 ? 'bg-warning' : 'bg-red-500'}`}></div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Analyse</h3>
                <p className="text-gray-200 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                  {insight.analysis_summary}
                </p>
              </div>

              {/* Offer */}
              <div>
                <h3 className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Stratégie Suggérée</h3>
                <div className="text-gray-200 bg-accent/10 border border-accent/20 p-3 rounded-lg">
                  💡 {insight.suggested_offer}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-red-400">Erreur lors de l'analyse. Veuillez réessayer.</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Fermer
          </button>
          {!isAnalyzing && insight && (
            <button 
              onClick={onSave}
              className="px-6 py-2 rounded-lg bg-primary hover:bg-blue-600 text-white font-medium shadow-lg shadow-primary/25 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Sauvegarder au CRM</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};