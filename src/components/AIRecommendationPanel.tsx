import React, { useEffect, useState } from 'react';
import { AIRecommendation } from '../types/AIRecommendation';

interface AIRecommendationPanelProps {
  recommendation: AIRecommendation | null;
  isLoading: boolean;
  companyOverview?: {
    Symbol: string;
    Name: string;
    PERatio: string;
    PEGRatio: string;
    DividendYield: string;
    EPS: string;
    ProfitMargin: string;
    OperatingMarginTTM: string;
    ReturnOnEquityTTM: string;
    QuarterlyEarningsGrowthYOY: string;
    QuarterlyRevenueGrowthYOY: string;
    AnalystTargetPrice: string;
    Beta: string;
    "52WeekHigh": string;
    "52WeekLow": string;
    AnalystRatingBuy: string;
    AnalystRatingHold: string;
    AnalystRatingSell: string;
  };
}

// Añadir la declaración de tipos para import.meta.env
declare global {
  interface ImportMeta {
    env: {
      VITE_OPEN_AI_API_KEY: string;
    }
  }
}

const AIRecommendationPanel: React.FC<AIRecommendationPanelProps> = ({ 
  recommendation, 
  isLoading,
  companyOverview 
}) => {
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendationType, setRecommendationType] = useState<'BUY' | 'HOLD' | 'SELL' | null>(null);

  useEffect(() => {
    const getAIRecommendation = async () => {
      if (!companyOverview) {
        console.log('No company overview data available');
        return;
      }

      setIsAnalyzing(true);
      setError(null);
      setAiResponse(null);
      setRecommendationType(null);

      try {
        const apiKey = import.meta.env.VITE_OPEN_AI_API_KEY;
        if (!apiKey) {
          throw new Error('API key no configurada. Verifica tus variables de entorno.');
        }

        const systemPrompt = `Eres un analista financiero experto. Analiza los siguientes datos y proporciona una recomendación clara (BUY, HOLD, o SELL) en tres oraciones concisas.`;

        console.log('Enviando solicitud a OpenAI API');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: JSON.stringify(companyOverview, null, 2) }
            ],
            temperature: 0.7,
            max_tokens: 250
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Error en la API de OpenAI: ${errorData.error?.message || response.statusText}`
          );
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0]?.message?.content) {
          throw new Error('Formato de respuesta inesperado de la API');
        }
        
        const rawResponse = data.choices[0].message.content;
        console.log('Respuesta de OpenAI:', rawResponse);
        setAiResponse(rawResponse);

        // Extraer la recomendación del texto
        const recommendationMatch = rawResponse.match(/\b(BUY|HOLD|SELL)\b/i);
        if (recommendationMatch) {
          setRecommendationType(recommendationMatch[1].toUpperCase() as 'BUY' | 'HOLD' | 'SELL');
        }
        
      } catch (error: any) {
        console.error('Error al obtener recomendación de IA:', error);
        setError(error.message);
      } finally {
        setIsAnalyzing(false);
      }
    };

    getAIRecommendation();
  }, [companyOverview]);

  // Solo mostrar el spinner cuando estamos analizando y no hay respuesta previa
  if (isAnalyzing && !aiResponse) {
    return (
      <div className="glass-panel p-4 rounded-lg border border-[#b9d6ee]/10 col-span-2 mt-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b9d6ee]"></div>
        </div>
      </div>
    );
  }

  // Si no hay respuesta y no hay error, no mostrar nada
  if (!aiResponse && !error) {
    return null;
  }

  const getRecommendationColor = (type: string | null) => {
    switch (type) {
      case 'BUY':
        return 'text-green-400';
      case 'SELL':
        return 'text-red-400';
      case 'HOLD':
        return 'text-yellow-400';
      default:
        return 'text-[#b9d6ee]';
    }
  };

  return (
    <div className="glass-panel p-4 rounded-lg border border-[#b9d6ee]/10 col-span-2 mt-6">
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#b9d6ee]">AI Analysis</h3>
          {recommendationType && (
            <span className={`text-lg font-bold ${getRecommendationColor(recommendationType)}`}>
              {recommendationType}
            </span>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-2 bg-red-400/10 border border-red-400/30 rounded-lg text-red-300 text-sm">
            Error: {error}
          </div>
        )}
        
        {aiResponse && (
          <div className="p-4 rounded-lg bg-[#b9d6ee]/5 border border-[#b9d6ee]/20">
            <p className="text-[#b9d6ee] whitespace-pre-wrap">{aiResponse}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRecommendationPanel;