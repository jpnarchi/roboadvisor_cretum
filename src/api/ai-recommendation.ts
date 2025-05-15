import { AIResponse } from '../types/AIRecommendation';
import { getAIRecommendation } from '../services/aiService';

export const fetchAIRecommendation = async (ticker: string): Promise<AIResponse> => {
  try {
    return await getAIRecommendation(ticker);
  } catch (error) {
    console.error('Error fetching AI recommendation:', error);
    return {
      recommendation: 'NEUTRAL',
      explanation: `Unable to analyze ${ticker} at this time.`
    };
  }
}; 