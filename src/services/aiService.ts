import { AIRecommendation } from '../types/AIRecommendation';

const ALPHA_VANTAGE_API_KEY = "Z77KZQ17AVAUO1NW";

export const getAIRecommendation = async (symbol: string): Promise<AIRecommendation> => {
  try {
    // Obtener datos de la compañía
    const companyData = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    ).then(res => res.json());

    // Obtener datos de precios
    const priceData = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    ).then(res => res.json());

    // Obtener datos de indicadores técnicos
    const technicalData = await fetch(
      `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${ALPHA_VANTAGE_API_KEY}`
    ).then(res => res.json());

    // Simular análisis AI con los datos obtenidos
    const analysis: AIRecommendation = {
      recommendation: 'HOLD' as const,
      explanation: [
        `Sector: ${companyData.Sector || 'N/A'}`,
        `Industry: ${companyData.Industry || 'N/A'}`,
        `Market Cap: ${companyData.MarketCapitalization || 'N/A'}`,
        `P/E Ratio: ${companyData.PERatio || 'N/A'}`,
        `RSI: ${technicalData['Technical Analysis: RSI']?.[Object.keys(technicalData['Technical Analysis: RSI'] || {})[0]]?.RSI || 'N/A'}`
      ].join('\n')
    };

    return analysis;
  } catch (error) {
    console.error('Error getting AI recommendation:', error);
    return {
      recommendation: 'HOLD' as const,
      explanation: 'Error al obtener datos para el análisis'
    };
  }
}; 