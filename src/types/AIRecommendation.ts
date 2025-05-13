export type RecommendationType = 'BUY' | 'HOLD' | 'SELL';

export interface AIRecommendation {
  recommendation: RecommendationType;
  explanation: string;
} 