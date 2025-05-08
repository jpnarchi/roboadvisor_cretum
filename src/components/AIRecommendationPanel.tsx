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
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const getAIRecommendation = async () => {
      if (!companyOverview) return;

      setIsAnalyzing(true);
      setError(null);

      try {
        // Verificar que la API key esté configurada
        const apiKey = import.meta.env.VITE_OPEN_AI_API_KEY;
        if (!apiKey) {
          throw new Error('API key no configurada. Verifica tus variables de entorno.');
        }
        const systemPrompt = `Eres un analista financiero experto. Analiza los siguientes datos y proporciona una recomendación clara (BUY, HOLD, o SELL) en tres oraciones concisas.
        
        A) Analiza cada acción del portafolio adjunto y clasifícala como "Comprar", "Vender" o "Mantener" siguiendo estos pasos:

        1. FASE PRELIMINAR - IDENTIFICACIÓN DEL TIPO DE ACCIÓN:
          - Clasifica primero cada acción como "Valor" o "Crecimiento" según:
            * Valor: P/E bajo respecto a su sector, P/B bajo (<1.5), dividend yield alto, crecimiento estable pero moderado
            * Crecimiento: Altos ratios de crecimiento de ingresos/beneficios, reinversión de ganancias, P/E elevado justificado por crecimiento futuro

        2. ANÁLISIS FUNDAMENTAL ADAPTATIVO:
          - Para acciones de VALOR:
            * Margen de Seguridad (Graham): ¿El precio actual está al menos 25% por debajo del valor intrínseco calculado?
            * Estabilidad financiera: Ratio deuda/capital <0.5, cobertura de intereses >3
            * Historial de dividendos: ¿Mantiene o incrementa dividendos en los últimos 5-10 años?
            * Ratio P/E actual vs histórico y vs sector
            * Ratio P/B preferiblemente <1.5 (Graham)
            
          - Para acciones de CRECIMIENTO:
            * PEG Ratio (P/E dividido por tasa de crecimiento) <1.5 indica potencial subvaloración
            * Crecimiento de ingresos y beneficios sostenible y consistente (>15% anual)
            * Ventaja competitiva sostenible y barreras de entrada
            * Retorno sobre capital invertido (ROIC) >15%
            * Flujo de caja libre creciente

        3. ANÁLISIS TÉCNICO COMPLEMENTARIO:
          * RSI (Relative Strength Index): Sobrecompra (>70) o sobreventa (<30)
          * Promedio móvil de 50 y 200 días (Golden/Death Cross)
          * Volumen de negociación reciente vs promedio histórico
          * Patrones de precio significativos

        4. EVALUACIÓN DE PRECIO OBJETIVO:
          * Compara el precio actual con el precio objetivo promedio de los analistas
          * Calcula el potencial de apreciación/depreciación porcentual
          * Ajusta por volatilidad del sector/región/divisa (Beta)

        5. CRITERIOS DE CLASIFICACIÓN FINAL:

          COMPRAR cuando:
          - Acciones de VALOR:
            * Precio actual <75% del valor intrínseco calculado
            * P/E y P/B significativamente por debajo del promedio histórico y sectorial
            * Dividend yield atractivo con cobertura segura
            * Fundamentos sólidos (baja deuda, flujo de caja estable)
            * Precio <80% del precio objetivo de analistas

          - Acciones de CRECIMIENTO:
            * PEG <1, crecimiento sostenible >20% anual
            * Ventaja competitiva clara y en expansión
            * ROIC consistentemente alto (>20%)
            * Potencial de apreciación >25% según precio objetivo

          MANTENER cuando:
          - Acciones de VALOR:
            * Precio entre 75-100% del valor intrínseco
            * Métricas financieras estables sin deterioro
            * Rendimiento total esperado (dividendos + apreciación) entre 5-15%
            * Sin señales técnicas claras de cambio de tendencia

          - Acciones de CRECIMIENTO:
            * PEG entre 1-2
            * Crecimiento de ingresos/beneficios entre 10-20%
            * Potencial de apreciación entre 10-25%
            * Posición competitiva estable

          VENDER cuando:
          - Acciones de VALOR:
            * Precio >120% del valor intrínseco calculado
            * Deterioro fundamental (aumento de deuda, reducción de márgenes)
            * Recorte de dividendos o cobertura insuficiente
            * Señales técnicas fuertemente bajistas
            * Múltiplos significativamente por encima del promedio histórico

          - Acciones de CRECIMIENTO:
            * Desaceleración significativa del crecimiento (<10%)
            * PEG >2.5
            * Erosión de ventaja competitiva
            * Flujo de caja libre negativo o en deterioro
            * Precio >120% del precio objetivo de analistas

        6. FACTORES CONTEXTUALES:
          * Ajusta por condiciones macroeconómicas (tasas de interés, inflación)
          * Considera exposición geográfica (riesgos/oportunidades por región)
          * Evalúa impacto de tipo de cambio para activos en múltiples divisas
          * Analiza tendencias del sector específico

        7. CONSIDERACIONES FINALES DE GRAHAM:
          * "Una operación de inversión es aquella que, después de un análisis exhaustivo, promete seguridad del principal y un rendimiento adecuado"
          * Preferencia por empresas con historial probado vs promesas futuras
          * Enfoque en el margen de seguridad como principio fundamental
          * Evaluar cada decisión considerando la composición total del portafolio

        Proporciona para cada acción:
        1. Clasificación final: COMPRAR/VENDER/MANTENER
        2. Tipo de acción: VALOR/CRECIMIENTO
        3. Principales métricas que justifican la decisión
        4. Potencial de retorno estimado (%)
        5. Nivel de confianza en la recomendación (Alto/Medio/Bajo)`;

                // Registra para depuración
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
                    max_tokens: 250 // Aumentado para asegurar respuestas completas
                  })
                });
        
                // Verificar si la respuesta es exitosa
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(
                    `Error en la API de OpenAI: ${errorData.error?.message || response.statusText}`
                  );
                }
        
                const data = await response.json();
                
                // Verificar si la estructura de la respuesta es la esperada
                if (!data.choices || !data.choices[0]?.message?.content) {
                  throw new Error('Formato de respuesta inesperado de la API');
                }
                
                const aiResponse = data.choices[0].message.content;
                
                // Mejorar la extracción de la recomendación
                // Buscar específicamente una recomendación al inicio o después de "recomendación es"
                const recommendationMatch = 
                  aiResponse.match(/^(BUY|HOLD|SELL)/i) || 
                  aiResponse.match(/recomendación\s+es\s+(BUY|HOLD|SELL)/i) ||
                  aiResponse.match(/(BUY|HOLD|SELL)/i); // Fallback al método original
                
                const recommendation = recommendationMatch 
                  ? (recommendationMatch[1] || recommendationMatch[0]).toUpperCase() 
                  : 'HOLD';
                
                setAiRecommendation({
                  recommendation,
                  explanation: aiResponse
                });
                
                // Log opcional para depuración
                console.log('Respuesta de OpenAI procesada correctamente');
                
              } catch (error: any) {
                console.error('Error al obtener recomendación de IA:', error);
                
                // Mensaje de error más específico para el usuario
                setError(error.message);
                
                setAiRecommendation({
                  recommendation: 'HOLD',
                  explanation: 'No se pudo generar una recomendación en este momento.'
                });
              } finally {
                setIsAnalyzing(false);
              }
            };
        
            getAIRecommendation();
          }, [companyOverview]);
        
          if (isLoading || isAnalyzing) {
            return (
              <div className="glass-panel p-4 rounded-lg border border-[#b9d6ee]/10 col-span-2 mt-6">
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b9d6ee]"></div>
                </div>
              </div>
            );
          }
        
          const currentRecommendation = aiRecommendation || recommendation;
          if (!currentRecommendation) return null;
        
          return (
            <div className="glass-panel p-4 rounded-lg border border-[#b9d6ee]/10 col-span-2 mt-6">
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-4 text-[#b9d6ee]">AI Recommends</h3>
                
                {error && (
                  <div className="mb-4 p-2 bg-red-400/10 border border-red-400/30 rounded-lg text-red-300 text-sm">
                    Error: {error}
                  </div>
                )}
                
                <div className={`text-4xl font-bold mb-4 ${getRecommendationColor(currentRecommendation.recommendation)}`}>
                  {currentRecommendation.recommendation}
                </div>
                <div className={`p-4 rounded-lg ${getRecommendationBg(currentRecommendation.recommendation)} text-center`}>
                  <p className="text-[#b9d6ee]">{currentRecommendation.explanation}</p>
                </div>
              </div>
            </div>
          );
        };
        
        export default AIRecommendationPanel;