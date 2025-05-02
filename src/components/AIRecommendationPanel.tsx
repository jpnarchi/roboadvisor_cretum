import React from 'react';
import { AIRecommendation } from '../types/AIRecommendation';

interface AIRecommendationPanelProps {
  recommendation: AIRecommendation | null;
  isLoading: boolean;
}

const AIRecommendationPanel: React.FC<AIRecommendationPanelProps> = ({ recommendation, isLoading }) => {
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'text-green-400';
      case 'SELL': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getRecommendationBg = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'bg-green-400/10 border-green-400/30';
      case 'SELL': return 'bg-red-400/10 border-red-400/30';
      default: return 'bg-yellow-400/10 border-yellow-400/30';
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-4 rounded-lg border border-[#b9d6ee]/10 col-span-2 mt-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b9d6ee]"></div>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  return (
    <div className="glass-panel p-4 rounded-lg border border-[#b9d6ee]/10 col-span-2 mt-6">
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-4 text-[#b9d6ee]">AI Recommends</h3>
        <div className={`text-4xl font-bold mb-4 ${getRecommendationColor(recommendation.recommendation)}`}>
          {recommendation.recommendation}
        </div>
        <div className={`p-4 rounded-lg ${getRecommendationBg(recommendation.recommendation)} text-center`}>
          <p className="text-[#b9d6ee]">{recommendation.explanation}</p>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendationPanel; 