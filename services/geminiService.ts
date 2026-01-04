import { GoogleGenAI, Type } from "@google/genai";
import { AIInsight, BusinessData, SearchResult } from "../types";

const apiKey = process.env.API_KEY as string;
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy' });

/**
 * Effectue une recherche "profonde" en segmentant la requête pour obtenir plus de résultats.
 */
export const searchBusinesses = async (query: string, location: string): Promise<SearchResult[]> => {
  if (!apiKey) return [];

  // On lance 3 stratégies de recherche en parallèle pour maximiser le volume
  const searchStrategies = [
    `Cherche des entreprises "${query}" à "${location}" qui ont une note faible ou pas de site web.`,
    `Cherche les entreprises "${query}" les plus populaires à "${location}".`,
    `Cherche des entreprises "${query}" situées aux alentours de "${location}".`
  ];

  try {
    const promises = searchStrategies.map(strategy => 
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Tu es un extracteur de données B2B.
        ${strategy}
        Utilise Google Maps.
        
        RÈGLES STRICTES:
        1. Trouve AUTANT de résultats que possible (minimum 10 par requête).
        2. Renvoie UNIQUEMENT un tableau JSON brut.
        3. Structure: [{"name": "...", "address": "...", "rating": 4.5, "website": "...", "phone": "...", "latitude": 0.0, "longitude": 0.0}]
        `,
        config: {
            tools: [{ googleMaps: {} }],
        }
      })
    );

    const responses = await Promise.all(promises);
    
    let allResults: SearchResult[] = [];
    const seenNames = new Set<string>();

    for (const response of responses) {
        let rawText = response.text;
        if (!rawText) continue;

        // Nettoyage JSON
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const data = JSON.parse(rawText);
            if (Array.isArray(data)) {
                data.forEach((item: any) => {
                    // Dédoublonnage simple par nom
                    if (!seenNames.has(item.name)) {
                        seenNames.add(item.name);
                        allResults.push({
                            source_id: `gen-${Math.random().toString(36).substr(2, 9)}`,
                            business_data: {
                                name: item.name,
                                address: item.address,
                                rating: item.rating,
                                phone: item.phone || undefined,
                                website: item.website || undefined,
                                // Email est vide pour l'instant, on l'enrichira plus tard
                            },
                            location: {
                                lat: item.latitude || 0,
                                lng: item.longitude || 0
                            }
                        });
                    }
                });
            }
        } catch (e) {
            console.warn("Erreur parsing JSON partiel:", e);
        }
    }

    return allResults;

  } catch (error) {
    console.error("Erreur Recherche Massive:", error);
    return [];
  }
};

/**
 * Tente de trouver l'email via Google Search (Web Scraping simulé par IA)
 */
export const enrichWithEmail = async (business: BusinessData): Promise<string | undefined> => {
    try {
        if (!business.website && !business.name) return undefined;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Plus rapide pour cette tâche
            contents: `Trouve l'adresse email de contact publique pour l'entreprise "${business.name}" située à "${business.address}".
            Cherche sur leur site web "${business.website}" ou sur des annuaires.
            Si tu trouves un email, renvoie-le simplement. Sinon renvoie "null".
            Ne renvoie que l'email ou "null", rien d'autre.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text?.trim();
        if (text && text.includes('@') && !text.includes('null')) {
            // Extraction basique d'email si l'IA bavarde un peu
            const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
            return match ? match[0] : undefined;
        }
        return undefined;

    } catch (e) {
        return undefined;
    }
};

/**
 * Analyse rapide pour scoring (peut être fait en masse)
 */
export const calculateScore = (business: BusinessData): AIInsight => {
    let score = 5; // Base
    let reasons = [];

    if (!business.website) {
        score += 3;
        reasons.push("Pas de site web");
    }
    
    if (business.rating && business.rating < 4.0) {
        score += 2;
        reasons.push("Note faible (< 4.0)");
    }

    if (!business.rating) {
        score += 1; // Opportunité de créer la fiche ?
    }

    // Cap à 10
    score = Math.min(10, score);

    return {
        score,
        analysis_summary: reasons.length > 0 ? reasons.join(", ") : "Profil standard",
        suggested_offer: !business.website ? "Création Site Web" : (business.rating && business.rating < 4 ? "Gestion e-réputation" : "Optimisation SEO"),
        is_target: score >= 7
    };
};

/**
 * Analyse approfondie (Ancienne méthode conservée pour le détail)
 */
export const analyzeProspectDeep = async (business: BusinessData): Promise<AIInsight> => {
   // On garde la logique existante mais on l'appelle "Deep"
    try {
        const prompt = `
        Analyse rapide B2B pour : ${business.name}.
        Site: ${business.website}. Note: ${business.rating}.
        Output JSON: {score: number (0-100), analysis_summary: string, suggested_offer: string, is_target: boolean}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(response.text || '{}');
    } catch (e) {
        // Fallback sur le calcul local
        const local = calculateScore(business);
        return { ...local, score: local.score * 10 }; // Scale to 100
    }
};