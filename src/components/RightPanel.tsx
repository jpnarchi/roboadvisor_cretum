import React, { useEffect, useState, useRef } from 'react';
import { getAIRecommendation } from '../services/aiService';
import AIRecommendationPanel from './AIRecommendationPanel';
import { AIRecommendation } from '../types/AIRecommendation';
import StockChart from './StockChart';
import html2pdf from 'html2pdf.js';
import { filters } from '../lib/Lookup';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Añade esta nueva función al componente RightPanel
const formatMarketCap = (value: string | number | undefined) => {
  if (value === undefined || value === null || value === 'None' || value === '') return 'N/A';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
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

// Updated interface for EODHD API response
interface EODHDCompanyOverview {
  "General::Code": string;
  "General::Sector": string;
  "Highlights::MarketCapitalization": number;
  "Valuation::TrailingPE": number;
  "Valuation::PriceBookMRQ": number;
  "SplitsDividends::ForwardAnnualDividendYield": number;
  "Technicals::Beta": number;
  "Highlights::ReturnOnAssetsTTM": number;
  "Highlights::ReturnOnEquityTTM": number;
  "AnalystRatings::TargetPrice": number;
  "SplitsDividends::ExDividendDate": string;
  "AnalystRatings::Rating": number;
  "AnalystRatings::StrongBuy": number;
  "AnalystRatings::Buy": number;
  "AnalystRatings::Hold": number;
  "AnalystRatings::Sell": number;
  "AnalystRatings::StrongSell": number;
  "Highlights::EPS": number;
  "Highlights::52WeekHigh": number;
  "Highlights::52WeekLow": number;
}

// Legacy interface to maintain compatibility
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
  "Market Capitalization": string | number;
  Sector: string;
  Rating: string | number;
  "Rated On": string;
  Price: string | number;
  overview?: CompanyOverview;
  eodhd?: EODHDCompanyOverview;
  market?: string;
  recommendation?: AIRecommendation | null;
  explanation?: string;
  "Since Rated"?: string;
  "Smart Momentum"?: number;
  Retracement?: string;
  "Trend Strength"?: number;
}

// Add cache at the top of the file, after imports
const dataCache = new Map<string, {
  timestamp: number;
  data: any;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const EODHD_API_KEY = "6824b2d80fe347.44604306";

const RightPanel: React.FC<RightPanelProps> = ({ selectedCompany, selectedTicker }) => {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    setIsExporting(true);

    try {
      const element = contentRef.current;
      
      // Configuración básica para html2pdf
      const opt = {
        margin: 0.5,
        filename: `${selectedTicker}_analysis.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
          scale: 1,
          useCORS: true,
          logging: false,
          backgroundColor: 'black',
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
          onclone: (clonedDoc: Document) => {
            // Aplicar estilos al documento clonado
            const style = clonedDoc.createElement('style');
            style.textContent = `
              * {
                
                text-color: black !important;
                color-adjust: exact !important;
                background-color: black !important;
              }
              .glass-panel {
                background: black !important;
                box-shadow: none !important;
              }
              .bg-black, .bg-black\\/40, .bg-black\\/50, .bg-black\\/80 {
                background: black !important;
              }
              .from-black\\/40, .to-\\[\\#b9d6ee\\]\\/5 {
                background: white !important;
              }
              .backdrop-blur-xl {
                backdrop-filter: none !important;
              }
              canvas {
                max-width: 100% !important;
                background-color: black !important;
                height: auto !important;
              }
            `;
            clonedDoc.head.appendChild(style);

            // Eliminar elementos innecesarios
            const elementsToRemove = clonedDoc.querySelectorAll('.export-button, .fixed');
            elementsToRemove.forEach((el: Element) => el.remove());

            // Asegurarse de que los canvases estén renderizados
            const canvases = clonedDoc.getElementsByTagName('canvas');
            Array.from(canvases).forEach((canvas: HTMLCanvasElement) => {
              canvas.style.width = '100%';
              canvas.style.height = 'auto';
            });
          }
        },
        jsPDF: { 
          unit: 'in', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        }
      };

      // Esperar a que los canvases se rendericen
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generar PDF
      await html2pdf().set(opt).from(element).save();

    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Updated function to fetch company data from EODHD API with caching
  const fetchCompanyDataFromEODHD = async (symbol: string): Promise<EODHDCompanyOverview | null> => {
    try {
      // Get market info and format symbol correctly
      // const market = getMarketForSymbol(symbol);
      const formattedSymbol = symbol;

      // Check cache first
      const cacheKey = `company_${formattedSymbol}`;
      const cachedData = dataCache.get(cacheKey);
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        console.log('Using cached company data for:', formattedSymbol);
        return cachedData.data;
      }

      console.log(`Fetching company data from EODHD API for ${formattedSymbol}...`);

      const response = await fetch(
        `https://eodhd.com/api/fundamentals/${formattedSymbol}?filter=${filters}&api_token=${EODHD_API_KEY}&fmt=json`
      );

      
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      dataCache.set(cacheKey, {
        timestamp: Date.now(),
        data
      });
      
      return data as EODHDCompanyOverview;
    } catch (error) {
      console.error(`Error fetching company data from EODHD API for ${symbol}:`, error);
      return null;
    }
  };

  // Updated function to fetch real-time prices with caching
  const fetchDailyPrices = async (ticker: string): Promise<{ close: number } | null> => {
    try {
      // Get market info and format symbol correctly
      // const market = getMarketForSymbol(ticker);
      const formattedSymbol = ticker;
          
      // Check cache first
      const cacheKey = `price_${formattedSymbol}`;
      const cachedData = dataCache.get(cacheKey);
      if (cachedData && Date.now() - cachedData.timestamp < 60000) { // 1 minute cache for prices
        console.log('Using cached price data for:', formattedSymbol);
        return cachedData.data;
      }

      const response = await fetch(
        `https://eodhd.com/api/real-time/${formattedSymbol}?api_token=${EODHD_API_KEY}&fmt=json`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      dataCache.set(cacheKey, {
        timestamp: Date.now(),
        data: { close: data.close }
      });
      
      return { close: data.close };
    } catch (error) {
      console.error('Error fetching real-time prices:', error);
      return null;
    }
  };

  // Modificar el useEffect principal para manejar todas las actualizaciones de estado
  useEffect(() => {
    let isMounted = true;
    console.log('=== STARTING DATA FETCH ===', selectedTicker);
    
    const fetchData = async () => {
      if (!selectedTicker) return;
      
      try {
        setIsLoading(true);
        
        // Fetch all data in parallel
        const [recommendation, eodhdData, priceData] = await Promise.all([
          getAIRecommendation(selectedTicker),
          fetchCompanyDataFromEODHD(selectedTicker),
          fetchDailyPrices(selectedTicker)
        ]);

        if (!isMounted) return;

        const currentPrice = priceData?.close || 0;
        
        if (eodhdData) {
          const newStockData: StockData = {
            Ticker: selectedTicker,
            "Market Capitalization": eodhdData["Highlights::MarketCapitalization"],
            Sector: eodhdData["General::Sector"] || "N/A",
            Rating: "N/A", // Inicializar como N/A, se actualizará con el portfolio trend
            "Rated On": "Not rated",
            Price: currentPrice,
            eodhd: eodhdData,
            recommendation: recommendation.recommendation,
            explanation: recommendation.explanation
          };
          
          setStockData(prevData => {
            // Solo actualizar si hay cambios reales
            if (JSON.stringify(prevData) === JSON.stringify(newStockData)) {
              return prevData;
            }
            return newStockData;
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedTicker]); // Solo depende de selectedTicker

  // Modificar el useEffect de portfolio trend para que sea más controlado
  useEffect(() => {
    let isMounted = true;
    
    const fetchPortfolioTrend = async () => {
      const trendsymbol = selectedTicker.replace('.US', '');

      if (!trendsymbol || !stockData) return;
      
      try {
        console.log('Fetching portfolio trend for:', selectedTicker);
        const response = await fetch('/portfolio_trend.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!isMounted) return;

        const text = await response.text();
        console.log('Raw response:', text);
        const cleanText = text.replace(/^\uFEFF/, '').trim();
        const sanitizedText = cleanText.replace(/: NaN/g, ': null');
        const data = JSON.parse(sanitizedText);

        console.log('All portfolio data:', data);
        console.log('Looking for ticker:', selectedTicker);
        
        // Buscar el ticker exacto
        const stockTrend = data.find((item: any) => {
          console.log('Comparing with:', item.Ticker);
          return item.Ticker === selectedTicker;
        });

        console.log('Found stock trend:', stockTrend);

        if (stockTrend && isMounted) {
          console.log('Updating with stock trend data:', {
            Rating: stockTrend.Rating,
            "Rated On": stockTrend["Rated On"],
            "Since Rated": stockTrend["Since Rated"],
            "Smart Momentum": stockTrend["Smart Momentum"],
            Retracement: stockTrend.Retracement,
            "Trend Strength": stockTrend["Trend Strength"]
          });

          setStockData(prevData => {
            if (!prevData) return prevData;

            const updatedData = {
              ...prevData,
              Rating: stockTrend.Rating,
              "Rated On": stockTrend["Rated On"],
              "Since Rated": stockTrend["Since Rated"],
              "Smart Momentum": Number(stockTrend["Smart Momentum"]),
              Retracement: stockTrend.Retracement,
              "Trend Strength": Number(stockTrend["Trend Strength"])
            };
            
            console.log('Previous data:', prevData);
            console.log('Updated data:', updatedData);
            
            // Solo actualizar si hay cambios reales
            if (JSON.stringify(prevData) === JSON.stringify(updatedData)) {
              console.log('No changes detected, keeping previous data');
              return prevData;
            }
            console.log('Changes detected, updating data');
            return updatedData;
          });
        } else {
          console.log('No stock trend found for ticker:', selectedTicker);
        }
      } catch (error) {
        console.error('Error processing portfolio trend:', error);
      }
    };

    fetchPortfolioTrend();
    
    // Update portfolio trend every 5 minutes
    const intervalId = setInterval(fetchPortfolioTrend, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedTicker]);

  const getRatingBackground = (rating: string | number | undefined) => {
    if (!rating || rating === 'N/A') return 'from-gray-500/5 border-gray-500/30';
    const ratingStr = String(rating).toUpperCase();
    switch (ratingStr.charAt(0)) {
      case 'A': return 'from-green-400/5 border-green-400/30';
      case 'B': return 'from-blue-400/5 border-blue-400/30';
      case 'C': return 'from-yellow-400/5 border-yellow-400/30';
      case 'D': return 'from-red-400/5 border-red-400/30';
      default: return 'from-gray-500/5 border-gray-500/30';
    }
  };

  const getRatingColor = (rating: string | number | undefined) => {
    if (!rating || rating === 'N/A') return 'text-gray-500';
    const ratingStr = String(rating).toUpperCase();
    switch (ratingStr.charAt(0)) {
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  const formatNumber = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === 'None' || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatPercentage = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === 'None' || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === 'None' || value === '') return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return `${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  };

  // Remove unused variables
  const marketCap = stockData?.eodhd?.["Highlights::MarketCapitalization"] || 
                   stockData?.overview?.["MarketCapitalization"] || 
                   'N/A';
  const peRatio = stockData?.eodhd?.["Valuation::TrailingPE"] || 
                  stockData?.overview?.["PERatio"] || 
                  'N/A';
  const dividendYield = stockData?.eodhd?.["SplitsDividends::ForwardAnnualDividendYield"] || 
                       stockData?.overview?.["DividendYield"] || 
                       'N/A';
  const beta = stockData?.eodhd?.["Technicals::Beta"] || 
              stockData?.overview?.["Beta"] || 
              'N/A';

  const price = typeof stockData?.Price === 'number'
    ? stockData.Price.toString()
    : stockData?.Price;

  return (
    <div className="flex-1 glass-panel p-8 overflow-hidden flex flex-col w-full bg-gradient-to-br from-black/40 to-[#b9d6ee]/5 backdrop-blur-xl">
      {isExporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/80 p-8 rounded-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#b9d6ee] mb-4"></div>
            <p className="text-[#b9d6ee] font-semibold">Generando PDF...</p>
          </div>
        </div>
      )}
      
      {selectedCompany ? (
        <div className="flex flex-col items-center p-3 overflow-auto w-full" ref={contentRef}>
          <div className="flex justify-between items-start w-full mb-8">
            <div className="flex-1">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r text-white bg-clip-text text-transparent">{selectedCompany}</h2>
                  {selectedTicker && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#b9d6ee] bg-[#b9d6ee]/5 px-4 py-1.5 rounded-lg border border-[#b9d6ee]/20 shadow-glow">
                        ({selectedTicker})
                      </span>
                      {stockData?.market && (
                        <span className="text-sm font-medium text-[#b9d6ee]/70 bg-[#b9d6ee]/5 px-2 py-1 rounded border border-[#b9d6ee]/20">
                          {stockData.market}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleExportPDF}
                  className="export-button flex items-center gap-2 px-4 py-2 bg-[#b9d6ee]/10 hover:bg-[#b9d6ee]/20 text-[#b9d6ee] rounded-lg border border-[#b9d6ee]/20 transition-all duration-200 shadow-glow"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export PDF
                </button>
              </div>
              <p className="text-[#b9d6ee]/60 text-sm">
                {stockData?.eodhd ? stockData.eodhd["General::Sector"] : (stockData?.overview?.Sector || 'Sector not available')}
              </p>
            </div>
          </div>
              
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b9d6ee]"></div>
            </div>
          ) : stockData && (
            <>
              <div className="mt-4 grid grid-cols-4 gap-6 w-full">
                <div className="glass-panel p-4 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Price</span>
                  <p className="text-2xl font-bold text-white mt-1">${price}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Market Cap</span>
                  <p className="text-2xl font-bold text-white mt-1">{formatMarketCap(marketCap)}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Price Target</span>
                  <p className="text-2xl font-bold text-white mt-1">{stockData.eodhd ? formatCurrency(stockData.eodhd["AnalystRatings::TargetPrice"]) : (stockData.overview?.AnalystTargetPrice || 'N/A')}</p>
                </div>
                {!isLoading && stockData && (
                  <div className={`glass-panel p-4 rounded-xl border bg-gradient-to-br to-transparent backdrop-blur-lg shadow-glow ${getRatingBackground(stockData.Rating)}`}>
                    <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Rating</span>
                    <div className={`text-2xl font-black mt-1 ${getRatingColor(stockData.Rating)}`}>
                      {stockData.Rating || 'N/A'}
                      <div className="text-xs text-[#b9d6ee]/50 font-medium">
                        {stockData["Rated On"] ? `Rated ${stockData["Rated On"]}` : 'Not rated'}
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
                      <p className="text-2xl font-bold text-white mt-1">{formatNumber(peRatio)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">P/B Ratio</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatNumber(stockData.eodhd ? stockData.eodhd["Valuation::PriceBookMRQ"] : stockData.overview?.PriceToBookRatio)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Dividend Yield</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatPercentage(dividendYield)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Beta</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatNumber(beta)}</p>
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
                      <p className="text-2xl font-bold text-white mt-1">{formatPercentage(stockData.eodhd ? stockData.eodhd["Highlights::ReturnOnAssetsTTM"] : stockData.overview?.ReturnOnAssetsTTM)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">ROE</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatPercentage(stockData.eodhd ? stockData.eodhd["Highlights::ReturnOnEquityTTM"] : stockData.overview?.ReturnOnEquityTTM)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Target Price</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stockData.eodhd ? stockData.eodhd["AnalystRatings::TargetPrice"] : stockData.overview?.AnalystTargetPrice)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Ex-Dividend</span>
                      <p className="text-2xl font-bold text-white mt-1">{stockData.eodhd ? stockData.eodhd["SplitsDividends::ExDividendDate"] : (stockData.overview?.ExDividendDate || 'N/A')}</p>
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
                        <span className="text-xl font-bold text-green-400">
                          {stockData.eodhd 
                            ? (stockData.eodhd["AnalystRatings::StrongBuy"] + stockData.eodhd["AnalystRatings::Buy"]) 
                            : (stockData.overview?.AnalystRatingBuy || '0')}
                        </span>
                      </div>
                      <div className="h-2 bg-green-400/10 rounded-full overflow-hidden shadow-glow">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-300 rounded-full" 
                          style={{ 
                            width: stockData.eodhd 
                              ? `${((stockData.eodhd["AnalystRatings::StrongBuy"] + stockData.eodhd["AnalystRatings::Buy"]) / 
                                  (stockData.eodhd["AnalystRatings::StrongBuy"] + stockData.eodhd["AnalystRatings::Buy"] + 
                                   stockData.eodhd["AnalystRatings::Hold"] + stockData.eodhd["AnalystRatings::Sell"] + 
                                   stockData.eodhd["AnalystRatings::StrongSell"])) * 100}%` 
                              : `${(parseInt(stockData.overview?.AnalystRatingBuy || '0') / 
                                  (parseInt(stockData.overview?.AnalystRatingBuy || '0') + 
                                   parseInt(stockData.overview?.AnalystRatingHold || '0') + 
                                   parseInt(stockData.overview?.AnalystRatingSell || '0'))) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-1 mx-8">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#b9d6ee]/70 font-medium">Hold</span>
                        <span className="text-xl font-bold text-yellow-400">
                          {stockData.eodhd 
                            ? stockData.eodhd["AnalystRatings::Hold"] 
                            : (stockData.overview?.AnalystRatingHold || '0')}
                        </span>
                      </div>
                      <div className="h-2 bg-yellow-400/10 rounded-full overflow-hidden shadow-glow">
                        <div 
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full" 
                          style={{ 
                            width: stockData.eodhd 
                              ? `${(stockData.eodhd["AnalystRatings::Hold"] / 
                                  (stockData.eodhd["AnalystRatings::StrongBuy"] + stockData.eodhd["AnalystRatings::Buy"] + 
                                   stockData.eodhd["AnalystRatings::Hold"] + stockData.eodhd["AnalystRatings::Sell"] + 
                                   stockData.eodhd["AnalystRatings::StrongSell"])) * 100}%` 
                              : `${(parseInt(stockData.overview?.AnalystRatingHold || '0') / 
                                  (parseInt(stockData.overview?.AnalystRatingBuy || '0') + 
                                   parseInt(stockData.overview?.AnalystRatingHold || '0') + 
                                   parseInt(stockData.overview?.AnalystRatingSell || '0'))) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#b9d6ee]/70 font-medium">Sell</span>
                        <span className="text-xl font-bold text-red-400">
                          {stockData.eodhd 
                            ? (stockData.eodhd["AnalystRatings::Sell"] + stockData.eodhd["AnalystRatings::StrongSell"]) 
                            : (stockData.overview?.AnalystRatingSell || '0')}
                        </span>
                      </div>
                      <div className="h-2 bg-red-400/10 rounded-full overflow-hidden shadow-glow">
                        <div 
                          className="h-full bg-gradient-to-r from-red-400 to-red-300 rounded-full" 
                          style={{ 
                            width: stockData.eodhd 
                              ? `${((stockData.eodhd["AnalystRatings::Sell"] + stockData.eodhd["AnalystRatings::StrongSell"]) / 
                                  (stockData.eodhd["AnalystRatings::StrongBuy"] + stockData.eodhd["AnalystRatings::Buy"] + 
                                   stockData.eodhd["AnalystRatings::Hold"] + stockData.eodhd["AnalystRatings::Sell"] + 
                                   stockData.eodhd["AnalystRatings::StrongSell"])) * 100}%` 
                              : `${(parseInt(stockData.overview?.AnalystRatingSell || '0') / 
                                  (parseInt(stockData.overview?.AnalystRatingBuy || '0') + 
                                   parseInt(stockData.overview?.AnalystRatingHold || '0') + 
                                   parseInt(stockData.overview?.AnalystRatingSell || '0'))) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
            
                <div className="col-span-1 lg:col-span-2">
                  <AIRecommendationPanel 
                    companyOverview={stockData?.overview}
                    recommendation={stockData?.recommendation}
                    explanation={stockData?.explanation}
                  />
                </div>
              </div>
            </>
          )}
          
          {selectedTicker && (
            <>
              <div className="mt-6 w-full glass-panel p-6 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                <h3 className="text-lg font-semibold mb-6 text-[#b9d6ee] flex items-center">
                  <span className="mr-2">Daily Price Chart</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#b9d6ee]/20 to-transparent"></div>
                </h3>
                <div className="h-64">
                  <StockChart symbol={selectedTicker} />
                </div>
              </div>
            </>
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