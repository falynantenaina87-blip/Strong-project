import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIInsight, BusinessData, SearchResult } from "../types";

// Note: In a real production app, never expose keys on client side.
// This is for demonstration purposes as per user context "Personal Use".
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Uses Gemini 2.5 Flash with Google Maps Grounding to find businesses.
 */
export const searchBusinesses = async (query: string): Promise<SearchResult[]> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // We ask Gemini to find places. The response will contain grounding chunks.
    const response = await ai.models.generateContent({
      model: model,
      contents: `Find businesses matching this query: "${query}". Provide a list of real places.`,
      config: {
        tools: [{ googleMaps: {} }],
        temperature: 0,
      }
    });

    const candidates = response.candidates?.[0];
    const chunks = candidates?.groundingMetadata?.groundingChunks;

    if (!chunks || chunks.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];

    // Map grounding chunks to our internal structure
    chunks.forEach((chunk: any, index: number) => {
      const entity = chunk.web?.title ? chunk.web : chunk.maps; // Fallback structure check
      
      // The structure of groundingChunks can vary slightly depending on if it's considered a "web" entity backed by maps or pure map
      // For Google Maps tool, we look for specific map data if available, or infer from title/uri
      
      // Note: The specific structure of `groundingChunks` for Maps tool:
      // It typically contains `maps` object with `title`, `placeId`, `address`, `location` (lat/lng via retrievalConfig usually, but here likely embedded)
      
      // Let's iterate and extract what we can. 
      // Since specific type definitions for groundingChunks are complex, we do safe access.
      
      // NOTE: As of the current SDK, `groundingChunks` typically provides the source.
      // However, the *text* of the response usually lists the places. 
      // To get structured data, we rely on the fact that the tool was used.
      // Parsing the *text* is unreliable. We will try to rely on the chunks if they contain map data.
      
      // If the model generates a list in text, we might need to parse that or ask for JSON.
      // BUT, `googleMaps` tool usage is best for *grounding*.
      
      // STRATEGY B:
      // Ask Gemini to format the found places into JSON using the context it retrieved.
      
      // Actually, let's use a two-step approach or a structured prompt WITH the tool.
      // But we can't force JSON *and* use the Tool easily in one go in all environments.
      // Let's try to extract from the grounding metadata if available, otherwise fallback.
      
      if (chunk.web && chunk.web.uri && chunk.web.uri.includes('google.com/maps')) {
         // This is a map link.
         results.push({
             source_id: `temp-${index}-${Date.now()}`,
             business_data: {
                 name: chunk.web.title || "Unknown Business",
                 address: "Address available in Maps Link", // We might not get full address in chunk
                 website: chunk.web.uri
             },
             location: { lat: 0, lng: 0 } // Lat/Lng might not be directly exposed in chunks easily without Maps JS
         });
      }
    });

    // REVISED STRATEGY for Demo Quality:
    // Since we cannot easily extract strict JSON *from the tool execution result* directly in the frontend SDK 
    // without complex parsing of the `groundingMetadata` which is often just citations,
    // We will ask Gemini to FIND and then FORMAT the data.
    
    // We will use a standard prompt that asks for JSON, relying on its internal knowledge + tool to verify.
    // However, `googleMaps` tool output isn't directly fed back as JSON to us, it's fed to the model.
    
    const jsonResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Search for "${query}" using Google Maps. 
        Return a JSON array of at least 5 businesses found. 
        Each object must have: name, address, rating (number), website (string or null), phone (string or null), latitude (number), longitude (number).
        Ensure the coordinates are approximate if exact ones aren't available.`,
        config: {
            tools: [{ googleMaps: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        address: { type: Type.STRING },
                        rating: { type: Type.NUMBER },
                        website: { type: Type.STRING, nullable: true },
                        phone: { type: Type.STRING, nullable: true },
                        latitude: { type: Type.NUMBER },
                        longitude: { type: Type.NUMBER }
                    },
                    required: ["name", "latitude", "longitude"]
                }
            }
        }
    });

    const rawText = jsonResponse.text;
    if(!rawText) return [];
    
    const data = JSON.parse(rawText);
    
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
            lat: item.latitude || 48.8566, // Default to Paris if fail
            lng: item.longitude || 2.3522
        }
    }));

  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
};

/**
 * Uses Gemini 3 Flash Preview (Thinking Model capabilities) to analyze the prospect.
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
        if (!text) throw new Error("No analysis generated");

        return JSON.parse(text) as AIInsight;

    } catch (error) {
        console.error("Analysis Error:", error);
        return {
            score: 0,
            analysis_summary: "Erreur lors de l'analyse IA.",
            suggested_offer: "Vérifier manuellement.",
            is_target: false
        };
    }
};