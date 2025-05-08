import React, { useEffect, useState, useRef } from 'react';
import StockChart from './StockChart';
import { getCompanyData, updateCompanyData } from '../services/companyService';
import { getAIRecommendation } from '../services/aiService';
import AIRecommendationPanel from './AIRecommendationPanel';
import { AIRecommendation } from '../types/AIRecommendation';
import html2pdf from 'html2pdf.js';

// Añade esta nueva función al componente RightPanel
const formatMarketCap = (value: string | undefined) => {
  if (!value || value === 'None' || value === '') return 'N/A';
  
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';
  
  // Convertir a billones (trillions en inglés)
  if (num >= 1000000000000) {
    return `$${(num / 1000000000000).toFixed(2)}T`;
  }
  // Convertir a miles de millones (billions en inglés)
  else if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(2)}B`;
  }
  // Convertir a millones
  else if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  // Para valores menores a un millón
  else {
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
};

interface RightPanelProps {
  selectedCompany: string | null;
  selectedTicker?: string | null;
}

interface CompanyOverview {
  Symbol: string;
  Name: string;
  Description: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  "52WeekHigh": string;
  "52WeekLow": string;
  "50DayMovingAverage": string;
  "200DayMovingAverage": string;
  SharesOutstanding: string;
  DividendDate: string;
  ExDividendDate: string;
  AnalystRatingBuy: string;
  AnalystRatingHold: string;
  AnalystRatingSell: string;
}

interface StockData {
  Ticker: string;
  "Market Capitalization": string;
  Sector: string;
  Rating: string;
  "Rated On": string;
  Price: string;
  overview?: CompanyOverview;
}

interface PortfolioTrendData {
  Weight: string;
  Ticker: string;
  Name: string;
  Price: string;
  Currency: string;
  "Market Capitalization": string;
  Sector: string;
  Rating: string;
  "Rated On": string;
  "Since Rated": string;
  "Smart Momentum": number;
  Retracement: string;
  "Trend Strength": number;
}

const RightPanel: React.FC<RightPanelProps> = ({ selectedCompany, selectedTicker }) => {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [portfolioTrend, setPortfolioTrend] = useState<PortfolioTrendData | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!contentRef.current) return;

    const element = contentRef.current;
    const opt = {
      margin: 1,
      filename: `${selectedCompany || 'stock'}_report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  // Función para obtener datos directamente de la API de Alpha Vantage
  const fetchCompanyDataFromAPI = async (symbol: string): Promise<CompanyOverview | null> => {
    try {
      const apiKey = "Z77KZQ17AVAUO1NW";
      console.log(`Fetching company data from Alpha Vantage API for ${symbol}...`);
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`API response for ${symbol}:`, data);
      
      // Verificar si la respuesta es un error de la API
      if (data.Note) {
        console.error(`API Error for ${symbol}:`, data.Note);
        return null;
      }
      
      // Verificar si tenemos datos válidos
      if (!data.Symbol) {
        console.error(`No valid data for ${symbol}`);
        return null;
      }
      
      return data as CompanyOverview;
    } catch (error) {
      console.error(`Error fetching company data from API for ${symbol}:`, error);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedTicker) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Actualizar datos de la compañía
        const updateSuccess = await updateCompanyData(selectedTicker);
        if (!updateSuccess) {
          throw new Error('Failed to update company data');
        }
        
        // Obtener datos de la compañía
        const companyData = await getCompanyData(selectedTicker);
        
        // Crear el objeto stockData con los datos de la compañía
        const stockData: StockData = {
          Ticker: selectedTicker,
          "Market Capitalization": companyData.MarketCapitalization || "N/A",
          Sector: companyData.Sector || "N/A",
          Rating: "N/A",
          "Rated On": "Not rated",
          Price: companyData["50DayMovingAverage"] || "N/A",
          overview: companyData
        };
        
        setStockData(stockData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data. Please try again later.');
        setStockData(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [selectedTicker]);

  useEffect(() => {
    const fetchAIRecommendation = async () => {
      if (!selectedTicker) return;
      
      setIsLoadingAI(true);
      try {
        const recommendation = await getAIRecommendation(selectedTicker);
        setAiRecommendation({
          recommendation: recommendation.recommendation,
          explanation: recommendation.reasoning.join('\n')
        });
      } catch (error) {
        console.error('Error getting AI recommendation:', error);
        setAiRecommendation(null);
      } finally {
        setIsLoadingAI(false);
      }
    };

    fetchAIRecommendation();
  }, [selectedTicker]);

  useEffect(() => {
    const fetchPortfolioTrend = async () => {
      if (!selectedTicker) return;
      
      // Reset portfolio trend when ticker changes
      setPortfolioTrend(null);
      console.log('Fetching portfolio trend for:', selectedTicker);
      
      try {
        const response = await fetch('/portfolio_trend.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        console.log('Raw response:', text.substring(0, 200) + '...');
        
        let data;
        try {
          // Remove any BOM characters and trim whitespace
          const cleanText = text.replace(/^\uFEFF/, '').trim();
          // Replace NaN with null in the JSON string
          const sanitizedText = cleanText.replace(/: NaN/g, ': null');
          data = JSON.parse(sanitizedText);
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          throw new Error('Invalid JSON format');
        }

        // Find the stock trend
        const stockTrend = data.find((item: any) => item.Ticker === selectedTicker);
        if (stockTrend) {
          // Create a new object with the correct types and ensure Rating is uppercase
          const typedStockTrend: PortfolioTrendData = {
            Weight: String(stockTrend.Weight || "0.00%"),
            Ticker: String(stockTrend.Ticker),
            Name: String(stockTrend.Name || ""),
            Price: String(stockTrend.Price || "N/A"),
            Currency: String(stockTrend.Currency || "USD"),
            "Market Capitalization": String(stockTrend["Market Capitalization"] || "N/A"),
            Sector: String(stockTrend.Sector || "N/A"),
            Rating: String(stockTrend.Rating || "N/A").toUpperCase(),
            "Rated On": stockTrend["Rated On"] ? String(stockTrend["Rated On"]) : new Date().toISOString().split('T')[0],
            "Since Rated": String(stockTrend["Since Rated"] || "0%"),
            "Smart Momentum": Number(stockTrend["Smart Momentum"] || 0),
            Retracement: String(stockTrend.Retracement || "0%"),
            "Trend Strength": Number(stockTrend["Trend Strength"] || 0)
          };
          
          console.log('Found stock trend:', typedStockTrend);
          setPortfolioTrend(typedStockTrend);
        } else {
          console.log('No stock trend found for:', selectedTicker);
          // Set default trend if no data found
          const defaultTrend: PortfolioTrendData = {
            Weight: "0.00%",
            Ticker: selectedTicker,
            Name: selectedCompany || "",
            Price: "N/A",
            Currency: "USD",
            "Market Capitalization": "N/A",
            Sector: "N/A",
            Rating: "N/A",
            "Rated On": new Date().toISOString().split('T')[0],
            "Since Rated": "0%",
            "Smart Momentum": 0,
            Retracement: "0%",
            "Trend Strength": 0
          };
          setPortfolioTrend(defaultTrend);
        }
      } catch (error) {
        console.error('Error processing portfolio trend:', error);
        // Set default trend on error
        const defaultTrend: PortfolioTrendData = {
          Weight: "0.00%",
          Ticker: selectedTicker,
          Name: selectedCompany || "",
          Price: "N/A",
          Currency: "USD",
          "Market Capitalization": "N/A",
          Sector: "N/A",
          Rating: "N/A",
          "Rated On": new Date().toISOString().split('T')[0],
          "Since Rated": "0%",
          "Smart Momentum": 0,
          Retracement: "0%",
          "Trend Strength": 0
        };
        setPortfolioTrend(defaultTrend);
      }
    };

    // Execute immediately when ticker changes
    fetchPortfolioTrend();
    
    // Set up interval for updates
    const intervalId = setInterval(fetchPortfolioTrend, 30000);

    // Clean up interval
    return () => clearInterval(intervalId);
  }, [selectedTicker, selectedCompany]);

  const getRatingBackground = (rating: string | undefined) => {
    if (!rating || rating === 'N/A') return 'from-gray-500/5 border-gray-500/30';
    const upperRating = rating.toUpperCase();
    switch (upperRating.charAt(0)) {
      case 'A': return 'from-green-400/5 border-green-400/30';
      case 'B': return 'from-blue-400/5 border-blue-400/30';
      case 'C': return 'from-yellow-400/5 border-yellow-400/30';
      case 'D': return 'from-red-400/5 border-red-400/30';
      default: return 'from-gray-500/5 border-gray-500/30';
    }
  };

  const getRatingColor = (rating: string | undefined) => {
    if (!rating || rating === 'N/A') return 'text-gray-500';
    const upperRating = rating.toUpperCase();
    switch (upperRating.charAt(0)) {
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  const formatNumber = (value: string | undefined) => {
    if (!value || value === 'None' || value === '') return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatPercentage = (value: string | undefined) => {
    if (!value || value === 'None' || value === '') return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: string | undefined) => {
    if (!value || value === 'None' || value === '') return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 glass-panel p-8 overflow-hidden flex flex-col w-full bg-gradient-to-br from-black/40 to-[#b9d6ee]/5 backdrop-blur-xl">
      {selectedCompany ? (
        <div className="flex flex-col items-center p-3 overflow-auto w-full" ref={contentRef}>
          <div className="flex justify-between items-start w-full mb-8">
            <div className="flex-1">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#b9d6ee] bg-clip-text text-transparent">{selectedCompany}</h2>
                  {selectedTicker && (
                    <span className="text-lg font-bold text-[#b9d6ee] bg-[#b9d6ee]/5 px-4 py-1.5 rounded-lg border border-[#b9d6ee]/20 shadow-glow">({selectedTicker})</span>
                  )}
                </div>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-[#b9d6ee]/10 hover:bg-[#b9d6ee]/20 text-[#b9d6ee] rounded-lg border border-[#b9d6ee]/20 transition-all duration-200 flex items-center gap-2 shadow-glow"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
              </div>
              <p className="text-[#b9d6ee]/60 text-sm">
                {stockData?.overview?.Sector || 'Sector not available'}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b9d6ee]"></div>
            </div>
          ) : stockData ? (
            <>
              <div className="mt-4 grid grid-cols-4 gap-6 w-full">
                <div className="glass-panel p-4 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Price</span>
                  <p className="text-2xl font-bold text-white mt-1">${parseFloat(stockData.Price).toFixed(2)}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Market Cap</span>
                  <p className="text-2xl font-bold text-white mt-1">{formatMarketCap(stockData.overview?.MarketCapitalization)}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Price Target</span>
                  <p className="text-2xl font-bold text-white mt-1">{stockData.overview?.AnalystTargetPrice || 'N/A'}</p>
                </div>
                {!isLoading && stockData && (
                  <div className={`glass-panel p-4 rounded-xl border bg-gradient-to-br to-transparent backdrop-blur-lg shadow-glow ${getRatingBackground(portfolioTrend?.Rating)}`}>
                    <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Rating</span>
                    <div className={`text-2xl font-black mt-1 ${getRatingColor(portfolioTrend?.Rating)}`}>
                      {portfolioTrend?.Rating || 'N/A'}
                      <div className="text-xs text-[#b9d6ee]/50 font-medium">
                        {portfolioTrend?.["Rated On"] ? `Rated ${portfolioTrend["Rated On"]}` : 'Not rated'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                <div className="glass-panel p-6 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <h3 className="text-lg font-semibold mb-6 text-[#b9d6ee] flex items-center">
                    <span className="mr-2">Key Metrics</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#b9d6ee]/20 to-transparent"></div>
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">P/E Ratio</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatNumber(stockData.overview?.PERatio)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">P/B Ratio</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatNumber(stockData.overview?.PriceToBookRatio)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Dividend Yield</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatPercentage(stockData.overview?.DividendYield)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Beta</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatNumber(stockData.overview?.Beta)}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <h3 className="text-lg font-semibold mb-6 text-[#b9d6ee] flex items-center">
                    <span className="mr-2">Returns & Targets</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#b9d6ee]/20 to-transparent"></div>
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">ROA</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatPercentage(stockData.overview?.ReturnOnAssetsTTM)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">ROE</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatPercentage(stockData.overview?.ReturnOnEquityTTM)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Target Price</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stockData.overview?.AnalystTargetPrice)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Ex-Dividend</span>
                      <p className="text-2xl font-bold text-white mt-1">{stockData.overview?.ExDividendDate || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow col-span-1 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-6 text-[#b9d6ee] flex items-center">
                    <span className="mr-2">Analyst Ratings</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#b9d6ee]/20 to-transparent"></div>
                  </h3>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#b9d6ee]/70 font-medium">Buy</span>
                        <span className="text-xl font-bold text-green-400">{stockData.overview?.AnalystRatingBuy || '0'}</span>
                      </div>
                      <div className="h-2 bg-green-400/10 rounded-full overflow-hidden shadow-glow">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-300 rounded-full" 
                          style={{ width: `${(parseInt(stockData.overview?.AnalystRatingBuy || '0') / (parseInt(stockData.overview?.AnalystRatingBuy || '0') + parseInt(stockData.overview?.AnalystRatingHold || '0') + parseInt(stockData.overview?.AnalystRatingSell || '0'))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-1 mx-8">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#b9d6ee]/70 font-medium">Hold</span>
                        <span className="text-xl font-bold text-yellow-400">{stockData.overview?.AnalystRatingHold || '0'}</span>
                      </div>
                      <div className="h-2 bg-yellow-400/10 rounded-full overflow-hidden shadow-glow">
                        <div 
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full" 
                          style={{ width: `${(parseInt(stockData.overview?.AnalystRatingHold || '0') / (parseInt(stockData.overview?.AnalystRatingBuy || '0') + parseInt(stockData.overview?.AnalystRatingHold || '0') + parseInt(stockData.overview?.AnalystRatingSell || '0'))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#b9d6ee]/70 font-medium">Sell</span>
                        <span className="text-xl font-bold text-red-400">{stockData.overview?.AnalystRatingSell || '0'}</span>
                      </div>
                      <div className="h-2 bg-red-400/10 rounded-full overflow-hidden shadow-glow">
                        <div 
                          className="h-full bg-gradient-to-r from-red-400 to-red-300 rounded-full" 
                          style={{ width: `${(parseInt(stockData.overview?.AnalystRatingSell || '0') / (parseInt(stockData.overview?.AnalystRatingBuy || '0') + parseInt(stockData.overview?.AnalystRatingHold || '0') + parseInt(stockData.overview?.AnalystRatingSell || '0'))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 lg:col-span-2">
                  <AIRecommendationPanel 
                    recommendation={aiRecommendation}
                    isLoading={isLoadingAI}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 text-[#b9d6ee]/70">
              {error}
            </div>
          )}

          {selectedTicker && !isLoading && (
            <div className="mt-6 w-full">
              <StockChart 
                ticker={selectedTicker} 
                companyName={selectedCompany || ''}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <img src="/menlog.svg" alt="CRETUM Partners Logo" className="h-32 w-auto opacity-10" />
        </div>
      )}
    </div>
  );
};

export default RightPanel;