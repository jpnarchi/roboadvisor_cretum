export type RecommendationType = 'BUY' | 'HOLD' | 'SELL' | 'N/A';

export interface AIRecommendation {
  recommendation: RecommendationType;
  explanation: string;
} 