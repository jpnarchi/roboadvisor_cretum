export type AIRecommendation = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
 
export interface AIResponse {
  recommendation: AIRecommendation;
  explanation: string;
} 