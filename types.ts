
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface ObjectAnalysis {
  name: string;
  category: string;
  description: string;
  confidence: number;
  tags: string[];
  interestingFacts: string[];
  suggestedActions: string[];
  boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized to 1000
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  analysis: ObjectAnalysis;
  image: string;
}

export interface AnalysisResponse {
  analysis: ObjectAnalysis;
  debug: {
    latency: number;
    rawResponse: string;
    timestamp: string;
  };
}
