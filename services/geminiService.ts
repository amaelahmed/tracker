
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { ObjectAnalysis, AnalysisResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-3-flash-preview";

export const analyzeObject = async (imageBase64: string): Promise<AnalysisResponse> => {
  const startTime = performance.now();

  const prompt = `Quickly identify the main object. 
  Output: JSON with name, category, short description, tags, 2 facts, and boundingBox [ymin, xmin, ymax, xmax] (0-1000).`;

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
            { text: prompt },
            { 
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
              } 
            }
        ]
      },
      config: {
        temperature: 0, // Lower temperature for more stable tracking
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            interestingFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            boundingBox: { 
              type: Type.ARRAY, 
              items: { type: Type.INTEGER },
            }
          },
          required: ["name", "category", "description", "confidence", "tags", "interestingFacts", "boundingBox"]
        }
      }
    });

    const endTime = performance.now();
    const text = response.text || "{}";

    try {
      const parsed = JSON.parse(text);
      return {
          analysis: parsed as ObjectAnalysis,
          debug: {
              latency: Math.round(endTime - startTime),
              rawResponse: text,
              timestamp: new Date().toLocaleTimeString()
          }
      };
    } catch (parseError) {
      console.error("JSON Error:", text);
      throw parseError;
    }
  } catch (error: any) {
    console.error("Vision Error:", error);
    throw error;
  }
};
