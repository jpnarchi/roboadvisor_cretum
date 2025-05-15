import type { Request, Response } from 'express';

type AIRecommendation = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

interface AIResponse {
  recommendation: AIRecommendation;
  explanation: string;
}

export function handleAIRecommendation(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      recommendation: 'NEUTRAL',
      explanation: 'Method not allowed'
    });
  }

  const { ticker } = req.query;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({
      recommendation: 'NEUTRAL',
      explanation: 'Invalid ticker parameter'
    });
  }

  try {
    // For now, return a mock response
    // In a real implementation, this would call your AI service
    return res.status(200).json({
      recommendation: 'NEUTRAL',
      explanation: `Analysis for ${ticker} is not available at this time.`
    });
  } catch (error) {
    console.error('Error generating AI recommendation:', error);
    return res.status(500).json({
      recommendation: 'NEUTRAL',
      explanation: 'Error generating recommendation'
    });
  }
} 