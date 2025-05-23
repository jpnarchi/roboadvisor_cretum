import { AIRecommendation, AIResponse } from '../types/AIRecommendation';
import OpenAI from 'openai';

// Initialize OpenAI client only if API key is available
const openai = import.meta.env.VITE_OPEN_AI_API_KEY 
  ? new OpenAI({
      apiKey: import.meta.env.VITE_OPEN_AI_API_KEY,
      dangerouslyAllowBrowser: true
    })
  : null;

const EODHD_API_KEY = "6824b2d80fe347.44604306";
const filters = "General::Code,General::Name,General::Sector,General::Industry,General::Description,Highlights::MarketCapitalization,Valuation::TrailingPE,Valuation::PriceBookMRQ,SplitsDividends::ForwardAnnualDividendYield,Technicals::Beta,Highlights::ReturnOnAssetsTTM,Highlights::ReturnOnEquityTTM,AnalystRatings::TargetPrice,SplitsDividends::ExDividendDate,AnalystRatings::Rating,AnalystRatings::StrongBuy,AnalystRatings::Buy,AnalystRatings::Hold,AnalystRatings::Sell,AnalystRatings::StrongSell,Highlights::EPS,Highlights::52WeekHigh,Highlights::52WeekLow";

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
5. Nivel de confianza en la recomendación (Alto/Medio/Bajo)

IMPORTANTE:
TU RESPUESTA DEBE DER MUY CORTA Y CONCISA, MENOS DE 4 ORACIONES Y DEBE DE SER UN RESUMEN DE TU DECISIÓN DEBE DE SER UN PARRAFO Y NADA EXTENSA Y DEBE DE SER EN FORMATO MARKDOWN.



`;

export const getAIRecommendation = async (ticker: string): Promise<AIResponse> => {
  try {
    // Fetch company data from EODHD API
    const response = await fetch(
      `https://eodhd.com/api/fundamentals/${ticker}?filter=${filters}&api_token=${EODHD_API_KEY}&fmt=json`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const companyData = await response.json();
    
    if (!companyData || Object.keys(companyData).length === 0) {
      console.error('No company data received for ticker:', ticker);
      return {
        recommendation: 'NEUTRAL',
        explanation: `Unable to analyze ${ticker} due to insufficient data.`
      };
    }

    // Check if OpenAI client is available
    if (!openai) {
      return {
        recommendation: 'NEUTRAL',
        explanation: 'AI analysis is currently unavailable. Please try again later.'
      };
    }

    // Log the received data for debugging
    console.log('Received company data:', companyData);

    // Helper function to safely parse numeric values
    const safeParseFloat = (value: any, defaultValue: number = 0): number => {
      if (value === undefined || value === null || value === 'None' || value === '') {
        return defaultValue;
      }
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    // Helper function to safely parse integer values
    const safeParseInt = (value: any, defaultValue: number = 0): number => {
      if (value === undefined || value === null || value === 'None' || value === '') {
        return defaultValue;
      }
      const parsed = parseInt(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    // Prepare the data for the AI with safe parsing
    const companyMetrics = {
      ticker: companyData["General::Code"] || ticker,
      name: companyData["General::Name"] || 'Unknown',
      sector: companyData["General::Sector"] || 'Unknown',
      industry: companyData["General::Industry"] || 'Unknown',
      description: companyData["General::Description"] || 'No description available',
      metrics: {
        // Valuation Metrics
        peRatio: safeParseFloat(companyData["Valuation::TrailingPE"]),
        priceToBook: safeParseFloat(companyData["Valuation::PriceBookMRQ"]),
        
        // Market Data
        marketCap: safeParseFloat(companyData["Highlights::MarketCapitalization"]),
        beta: safeParseFloat(companyData["Technicals::Beta"]),
        
        // Returns & Efficiency
        roa: safeParseFloat(companyData["Highlights::ReturnOnAssetsTTM"]),
        roe: safeParseFloat(companyData["Highlights::ReturnOnEquityTTM"]),
        
        // Dividends
        dividendYield: safeParseFloat(companyData["SplitsDividends::ForwardAnnualDividendYield"]),
        
        // Technical Indicators
        eps: safeParseFloat(companyData["Highlights::EPS"]),
        fiftyTwoWeekHigh: safeParseFloat(companyData["Highlights::52WeekHigh"]),
        fiftyTwoWeekLow: safeParseFloat(companyData["Highlights::52WeekLow"]),
        
        // Analyst Ratings
        targetPrice: safeParseFloat(companyData["AnalystRatings::TargetPrice"]),
        rating: safeParseFloat(companyData["AnalystRatings::Rating"]),
        analystStrongBuy: safeParseInt(companyData["AnalystRatings::StrongBuy"]),
        analystBuy: safeParseInt(companyData["AnalystRatings::Buy"]),
        analystHold: safeParseInt(companyData["AnalystRatings::Hold"]),
        analystSell: safeParseInt(companyData["AnalystRatings::Sell"]),
        analystStrongSell: safeParseInt(companyData["AnalystRatings::StrongSell"])
      }
    };

    // Log the processed metrics for debugging
    console.log('Processed company metrics:', companyMetrics);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analiza la siguiente acción con todos sus datos financieros y de mercado:

Símbolo: ${companyMetrics.ticker}
Nombre: ${companyMetrics.name}
Sector: ${companyMetrics.sector}
Industria: ${companyMetrics.industry}
Descripción: ${companyMetrics.description}

Métricas de Valoración:
- P/E Ratio: ${companyMetrics.metrics.peRatio}
- P/B Ratio: ${companyMetrics.metrics.priceToBook}

Datos de Mercado:
- Capitalización de Mercado: $${companyMetrics.metrics.marketCap}
- Beta: ${companyMetrics.metrics.beta}

Retornos y Eficiencia:
- ROA: ${companyMetrics.metrics.roa}%
- ROE: ${companyMetrics.metrics.roe}%

Dividendos:
- Dividend Yield: ${companyMetrics.metrics.dividendYield}%

Indicadores Técnicos:
- EPS: $${companyMetrics.metrics.eps}
- Máximo 52 semanas: $${companyMetrics.metrics.fiftyTwoWeekHigh}
- Mínimo 52 semanas: $${companyMetrics.metrics.fiftyTwoWeekLow}

Calificaciones de Analistas:
- Precio Objetivo: $${companyMetrics.metrics.targetPrice}
- Rating General: ${companyMetrics.metrics.rating}
- Strong Buy: ${companyMetrics.metrics.analystStrongBuy}
- Buy: ${companyMetrics.metrics.analystBuy}
- Hold: ${companyMetrics.metrics.analystHold}
- Sell: ${companyMetrics.metrics.analystSell}
- Strong Sell: ${companyMetrics.metrics.analystStrongSell}

Por favor, analiza estos datos y proporciona una recomendación concisa siguiendo los criterios establecidos.` }
      ],
      temperature: 0.7,
      max_tokens: 500
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