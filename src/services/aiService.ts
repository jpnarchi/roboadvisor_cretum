import { AIRecommendation, AIResponse } from '../types/AIRecommendation';
import { getCompanyData } from './companyService';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPEN_AI_API_KEY,
  dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `A) Analiza cada acción del portafolio adjunto y clasifícala como "Comprar", "Vender" o "Mantener" siguiendo estos pasos:

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

export const getAIRecommendation = async (ticker: string): Promise<AIResponse> => {
  try {
    // Get company data to analyze
    const companyData = await getCompanyData(ticker);
    
    if (!companyData) {
      return {
        recommendation: 'NEUTRAL',
        explanation: `Unable to analyze ${ticker} due to insufficient data.`
      };
    }

    // Prepare the data for the AI
    const companyMetrics = {
      ticker: companyData.Symbol,
      name: companyData.Name,
      sector: companyData.Sector,
      industry: companyData.Industry,
      metrics: {
        peRatio: parseFloat(companyData.PERatio || '0'),
        pegRatio: parseFloat(companyData.PEGRatio || '0'),
        dividendYield: parseFloat(companyData.DividendYield || '0'),
        beta: parseFloat(companyData.Beta || '0'),
        roe: parseFloat(companyData.ReturnOnEquityTTM || '0'),
        profitMargin: parseFloat(companyData.ProfitMargin || '0'),
        priceToBook: parseFloat(companyData.PriceToBookRatio || '0'),
        revenueGrowth: parseFloat(companyData.QuarterlyRevenueGrowthYOY || '0'),
        earningsGrowth: parseFloat(companyData.QuarterlyEarningsGrowthYOY || '0'),
        analystTargetPrice: parseFloat(companyData.AnalystTargetPrice || '0'),
        currentPrice: parseFloat(companyData["50DayMovingAverage"] || '0'),
        description: companyData.Description
      }
    };

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analiza la siguiente acción: ${JSON.stringify(companyMetrics, null, 2)}` }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const analysis = completion.choices[0].message.content;
    
    // Parse the AI response to extract recommendation
    let recommendation: AIRecommendation = 'NEUTRAL';
    if (analysis?.includes('COMPRAR')) {
      recommendation = 'STRONG_BUY';
    } else if (analysis?.includes('VENDER')) {
      recommendation = 'STRONG_SELL';
    } else if (analysis?.includes('MANTENER')) {
      recommendation = 'NEUTRAL';
    }

    return {
      recommendation,
      explanation: analysis || 'No analysis available.'
    };
  } catch (error) {
    console.error('Error in AI recommendation:', error);
    return {
      recommendation: 'NEUTRAL',
      explanation: `Unable to analyze ${ticker} at this time.`
    };
  }
}; 