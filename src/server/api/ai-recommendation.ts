import { AIResponse } from '../../types/AIRecommendation';
import { getAIRecommendation } from '../../services/aiService';

export const handleAIRecommendation = async (ticker: string): Promise<AIResponse> => {
  try {
    return await getAIRecommendation(ticker);
  } catch (error) {
    console.error('Error generating AI recommendation:', error);
    return {
      recommendation: 'NEUTRAL',
      explanation: `Unable to analyze ${ticker} at this time.`
    };
  }
}; 