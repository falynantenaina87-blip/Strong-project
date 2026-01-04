import { GoogleGenAI, Type } from "@google/genai";
import { AIInsight, BusinessData, SearchResult } from "../types";

// La clé API est injectée via vite.config.ts depuis VITE_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Utilise Gemini 2.5 Flash avec Google Maps Grounding pour trouver des entreprises.
 */
export const searchBusinesses = async (query: string): Promise<SearchResult[]> => {
  try {
    // Stratégie : On demande à Gemini d'utiliser Maps, puis de formater la réponse en JSON pur.
    // Note : On ne peut pas utiliser `responseSchema` en même temps que `tools: googleMaps`.
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Tu es un assistant de prospection. Cherche des entreprises correspondant à cette requête : "${query}".
        Utilise Google Maps pour vérifier leur existence.
        
        IMPORTANT : Une fois les résultats trouvés, génère UNIQUEMENT un tableau JSON strict (sans Markdown, sans texte autour).
        Chaque objet du tableau doit avoir cette structure :
        {
          "name": "Nom de l'entreprise",
          "address": "Adresse complète",
          "rating": 4.5 (nombre ou null),
          "website": "URL du site (ou null)",
          "phone": "Numéro de téléphone (ou null)",
          "latitude": 48.85 (nombre approx),
          "longitude": 2.35 (nombre approx)
        }
        
        Trouve au moins 5 résultats pertinents.`,
        config: {
            tools: [{ googleMaps: {} }],
            // Pas de responseMimeType: "application/json" ici car incompatible avec les outils sur ce modèle pour l'instant
        }
    });

    let rawText = response.text;
    if(!rawText) return [];
    
    // Nettoyage du Markdown si Gemini en a ajouté (```json ... ```)
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (e) {
        console.warn("Échec du parsing JSON de la réponse Maps. Texte brut :", rawText);
        return [];
    }
    
    if (!Array.isArray(data)) return [];
    
    return data.map((item: any, idx: number) => ({
        source_id: `gen-${idx}-${Date.now()}`,
        business_data: {
            name: item.name,
            address: item.address,
            rating: item.rating,
            phone: item.phone || undefined,
            website: item.website || undefined,
        },
        location: {
            lat: item.latitude || 48.8566, // Fallback si non trouvé
            lng: item.longitude || 2.3522
        }
    }));

  } catch (error) {
    console.error("Erreur Recherche:", error);
    return [];
  }
};

/**
 * Utilise Gemini 3 Flash Preview (Thinking Model) pour analyser le prospect.
 */
export const analyzeProspect = async (business: BusinessData): Promise<AIInsight> => {
    try {
        const prompt = `
        Agis comme un expert en développement commercial et stratégie digitale.
        Analyse cette entreprise :
        Nom: ${business.name}
        Site Web: ${business.website || "Non renseigné"}
        Note: ${business.rating || "N/A"}
        Adresse: ${business.address || "N/A"}

        Tâche :
        1. Détermine si c'est une bonne cible pour une agence de marketing digital / développement web.
        2. Donne un score de 0 à 100 (100 = prospect idéal).
        3. Rédige un résumé de l'analyse en 2 phrases.
        4. Suggère une approche commerciale ("Icebreaker") ou une offre spécifique.

        Réponds en JSON uniquement.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        analysis_summary: { type: Type.STRING },
                        suggested_offer: { type: Type.STRING },
                        is_target: { type: Type.BOOLEAN }
                    },
                    required: ["score", "analysis_summary", "suggested_offer", "is_target"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("Pas de réponse de l'IA");

        return JSON.parse(text) as AIInsight;

    } catch (error) {
        console.error("Erreur Analyse:", error);
        return {
            score: 0,
            analysis_summary: "Erreur lors de l'analyse IA ou quota dépassé.",
            suggested_offer: "Vérifier manuellement.",
            is_target: false
        };
    }
};