import React, { useEffect, useState, useRef } from 'react';
import { getCompanyData, updateCompanyData } from '../services/companyService';
import { getAIRecommendation } from '../services/aiService';
import AIRecommendationPanel from './AIRecommendationPanel';
import { AIRecommendation } from '../types/AIRecommendation';
import StockChart from './StockChart';
import html2pdf from 'html2pdf.js';
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

// Add cache at the top of the file, after imports
const dataCache = new Map<string, {
  timestamp: number;
  data: any;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
          onclone: (clonedDoc: Document) => {
            // Aplicar estilos al documento clonado
            const style = clonedDoc.createElement('style');
            style.textContent = `
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .glass-panel {
                background: white !important;
                box-shadow: none !important;
              }
              .bg-black, .bg-black\\/40, .bg-black\\/50, .bg-black\\/80 {
                background: white !important;
              }
              .from-black\\/40, .to-\\[\\#b9d6ee\\]\\/5 {
                background: white !important;
              }
              .backdrop-blur-xl {
                backdrop-filter: none !important;
              }
              canvas {
                max-width: 100% !important;
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
      const cleanSymbol = symbol.includes('.') 
        ? `${symbol.split('.')[0]}.${symbol.split('.')[1] === 'BMV' ? 'MX' : 
           symbol.split('.')[1] === 'DEX' ? 'DE' : 
           symbol.split('.')[1] === 'LON' ? 'GB' : 
           symbol.split('.')[1] === 'MIL' ? 'IT' : 'US'}`
        : `${symbol}.US`;

      // Check cache first
      const cacheKey = `company_${cleanSymbol}`;
      const cachedData = dataCache.get(cacheKey);
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        console.log('Using cached company data for:', cleanSymbol);
        return cachedData.data;
      }

      console.log(`Fetching company data from EODHD API for ${cleanSymbol}...`);
      
      const apiToken = "6824b2d80fe347.44604306";
      const filters = [
        "General::Code",
        "General::Sector",
        "Highlights::MarketCapitalization",
        "Valuation::TrailingPE",
        "Valuation::PriceBookMRQ",
        "SplitsDividends::ForwardAnnualDividendYield",
        "Technicals::Beta",
        "Highlights::ReturnOnAssetsTTM",
        "Highlights::ReturnOnEquityTTM",
        "AnalystRatings::TargetPrice",
        "SplitsDividends::ExDividendDate",
        "AnalystRatings::Rating",
        "AnalystRatings::StrongBuy",
        "AnalystRatings::Buy",
        "AnalystRatings::Hold",
        "AnalystRatings::Sell",
        "AnalystRatings::StrongSell"
      ].join(",");
      
      const response = await fetch(
        `https://eodhd.com/api/fundamentals/${cleanSymbol}?filter=${filters}&api_token=${apiToken}&fmt=json`
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
      const cleanSymbol = ticker.includes('.') 
        ? `${ticker.split('.')[0]}.${ticker.split('.')[1] === 'BMV' ? 'MX' : 
           ticker.split('.')[1] === 'DEX' ? 'DE' : 
           ticker.split('.')[1] === 'LON' ? 'GB' : 
           ticker.split('.')[1] === 'MIL' ? 'IT' : 'US'}`
        : `${ticker}.US`;
          
      // Check cache first
      const cacheKey = `price_${cleanSymbol}`;
      const cachedData = dataCache.get(cacheKey);
      if (cachedData && Date.now() - cachedData.timestamp < 60000) { // 1 minute cache for prices
        console.log('Using cached price data for:', cleanSymbol);
        return cachedData.data;
      }

      const apiToken = "6824b2d80fe347.44604306";
      const response = await fetch(
        `https://eodhd.com/api/real-time/${cleanSymbol}?api_token=${apiToken}&fmt=json`
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

  // Add new function to fetch daily prices
  const fetchDailyPriceData = async (symbol: string) => {
    try {
      const cleanSymbol = symbol.includes('.') 
        ? `${symbol.split('.')[0]}.${symbol.split('.')[1] === 'BMV' ? 'MX' : 
           symbol.split('.')[1] === 'DEX' ? 'DE' : 
           symbol.split('.')[1] === 'LON' ? 'GB' : 
           symbol.split('.')[1] === 'MIL' ? 'IT' : 'US'}`
        : `${symbol}.US`;

      // Get dates for last 3 years
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 3);

      const fromDate = startDate.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];

      const apiToken = "6824b2d80fe347.44604306";
      const response = await fetch(
        `https://eodhd.com/api/eod/${cleanSymbol}?from=${fromDate}&to=${toDate}&api_token=${apiToken}&fmt=json`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Sort data by date (newest first)
      const sortedData = data.sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setStockData(prevData => ({
        ...prevData,
        Ticker: symbol,
        "Market Capitalization": sortedData[0]["Market Capitalization"],
        Sector: sortedData[0].sector,
        Rating: sortedData[0].rating,
        "Rated On": "Not rated",
        Price: sortedData[0].close,
        eodhd: {
          "General::Code": sortedData[0].symbol,
          "General::Sector": sortedData[0].sector,
          "Highlights::MarketCapitalization": sortedData[0]["Market Capitalization"],
          "Valuation::TrailingPE": sortedData[0].trailing_pe,
          "Valuation::PriceBookMRQ": sortedData[0].price_book_mrq,
          "SplitsDividends::ForwardAnnualDividendYield": sortedData[0].dividend_yield,
          "Technicals::Beta": sortedData[0].beta,
          "Highlights::ReturnOnAssetsTTM": sortedData[0].return_on_assets_ttm,
          "Highlights::ReturnOnEquityTTM": sortedData[0].return_on_equity_ttm,
          "AnalystRatings::TargetPrice": sortedData[0].target_price,
          "SplitsDividends::ExDividendDate": sortedData[0].ex_dividend_date,
          "AnalystRatings::Rating": sortedData[0].rating,
          "AnalystRatings::StrongBuy": sortedData[0].analyst_strong_buy,
          "AnalystRatings::Buy": sortedData[0].analyst_buy,
          "AnalystRatings::Hold": sortedData[0].analyst_hold,
          "AnalystRatings::Sell": sortedData[0].analyst_sell,
          "AnalystRatings::StrongSell": sortedData[0].analyst_strong_sell
        },
        market: sortedData[0].market,
        recommendation: sortedData[0].recommendation as AIRecommendation || null
      }));
    } catch (error) {
      console.error('Error fetching daily price data:', error);
    }
  };

  useEffect(() => {
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

        // Fetch daily price data for the chart
        await fetchDailyPriceData(selectedTicker);

        const currentPrice = priceData?.close || 0;
        
        if (eodhdData) {
          const newStockData: StockData = {
            Ticker: selectedTicker,
            "Market Capitalization": eodhdData["Highlights::MarketCapitalization"],
            Sector: eodhdData["General::Sector"] || "N/A",
            Rating: eodhdData["AnalystRatings::Rating"] || "N/A",
            "Rated On": "Not rated",
            Price: currentPrice,
            eodhd: eodhdData,
            market: selectedTicker.includes('.BMV') ? 'Mexico' :
                    selectedTicker.includes('.DEX') ? 'XETRA' :
                    selectedTicker.includes('.LON') ? 'LSE' :
                    selectedTicker.includes('.MIL') ? 'Milan' : 'US',
            recommendation: recommendation.recommendation,
            explanation: recommendation.explanation
          };
          
          setStockData(newStockData);
        } else {
          // Fallback to the old method if EODHD fails
          const updateSuccess = await updateCompanyData(selectedTicker);
          if (!updateSuccess) {
            throw new Error('Failed to update company data');
          }
          
        const companyData = await getCompanyData(selectedTicker);
          
          const newStockData: StockData = {
            Ticker: selectedTicker,
            "Market Capitalization": companyData.MarketCapitalization || "N/A",
            Sector: companyData.Sector || "N/A",
            Rating: "N/A",
            "Rated On": "Not rated",
            Price: currentPrice || companyData["50DayMovingAverage"] || "N/A",
            overview: companyData,
            market: selectedTicker.includes('.BMV') ? 'Mexico' :
                    selectedTicker.includes('.DEX') ? 'XETRA' :
                    selectedTicker.includes('.LON') ? 'LSE' :
                    selectedTicker.includes('.MIL') ? 'Milan' : 'US',
            recommendation: recommendation.recommendation,
            explanation: recommendation.explanation
          };
        
          setStockData(newStockData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [selectedTicker]);

  // Update portfolio trend less frequently
  useEffect(() => {
    const fetchPortfolioTrend = async () => {
      if (!selectedTicker) return;
      
      try {
        const response = await fetch('/portfolio_trend.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const cleanText = text.replace(/^\uFEFF/, '').trim();
        const sanitizedText = cleanText.replace(/: NaN/g, ': null');
        const data = JSON.parse(sanitizedText);

        const stockTrend = data.find((item: any) => item.Ticker === selectedTicker);
        if (stockTrend) {
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
          
          setStockData(prevData => ({
            ...typedStockTrend,
            recommendation: prevData?.recommendation,
            explanation: prevData?.explanation
          }));
        }
      } catch (error) {
        console.error('Error processing portfolio trend:', error);
      }
    };

    fetchPortfolioTrend();
    
    // Update portfolio trend every 5 minutes instead of 30 seconds
    const intervalId = setInterval(fetchPortfolioTrend, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [selectedTicker, selectedCompany]);

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
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  };

  // Update the string/number conversions
  const marketCap = typeof stockData?.["Market Capitalization"] === 'number' 
    ? stockData["Market Capitalization"].toString() 
    : stockData?.["Market Capitalization"];

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
                  <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#b9d6ee] bg-clip-text text-transparent">{selectedCompany}</h2>
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
                      <p className="text-2xl font-bold text-white mt-1">{formatNumber(stockData.eodhd ? stockData.eodhd["Valuation::TrailingPE"] : stockData.overview?.PERatio)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">P/B Ratio</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatNumber(stockData.eodhd ? stockData.eodhd["Valuation::PriceBookMRQ"] : stockData.overview?.PriceToBookRatio)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Dividend Yield</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatPercentage(stockData.eodhd ? stockData.eodhd["SplitsDividends::ForwardAnnualDividendYield"] : stockData.overview?.DividendYield)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-[#b9d6ee]/70 font-medium">Beta</span>
                      <p className="text-2xl font-bold text-white mt-1">{formatNumber(stockData.eodhd ? stockData.eodhd["Technicals::Beta"] : stockData.overview?.Beta)}</p>
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