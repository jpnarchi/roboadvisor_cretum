import React, { useEffect, useState, useRef } from 'react';
import StockChart from './StockChart';
import { getCompanyData, updateCompanyData } from '../services/companyService';
import { getAIRecommendation } from '../services/aiService';
import AIRecommendationPanel from './AIRecommendationPanel';
import { AIRecommendation } from '../types/AIRecommendation';
import html2pdf from 'html2pdf.js';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData
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

interface DailyPriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const RightPanel: React.FC<RightPanelProps> = ({ selectedCompany, selectedTicker }) => {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [portfolioTrend, setPortfolioTrend] = useState<PortfolioTrendData | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dailyPrices, setDailyPrices] = useState<DailyPriceData[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  const handleExport = async () => {
    if (!contentRef.current) return;

    const element = contentRef.current;
    const opt = {
      margin: 0.2,
      filename: `${selectedCompany || 'stock'}_report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        backgroundColor: '#1a1a1a',
        logging: true,
        useCORS: true
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait',
        compress: true
      }
    };

    try {
      // Aplicar estilos temporales para el PDF
      const originalStyles = element.getAttribute('style') || '';
      element.setAttribute('style', `
        ${originalStyles}
        background-color: #1a1a1a !important;
        color: #ffffff !important;
      `);

      // Aplicar estilos a todos los elementos dentro del contenedor
      const allElements = element.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as HTMLElement;
        const currentStyle = el.getAttribute('style') || '';
        
        // Si es un h2, aplicar color blanco sólido
        if (el.tagName.toLowerCase() === 'h2') {
          el.setAttribute('style', `
            ${currentStyle}
            color: #ffffff !important;
            background: none !important;
            -webkit-background-clip: initial !important;
            background-clip: initial !important;
            text-fill-color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
          `);
        } else {
          el.setAttribute('style', `
            ${currentStyle}
            background-color: #1a1a1a !important;
            color: #ffffff !important;
            border-color: #333333 !important;
          `);
        }
      }

      await html2pdf().set(opt).from(element).save();

      // Restaurar estilos originales
      element.setAttribute('style', originalStyles);
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as HTMLElement;
        el.removeAttribute('style');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  // Updated function to fetch company data from EODHD API
  const fetchCompanyDataFromEODHD = async (symbol: string): Promise<EODHDCompanyOverview | null> => {
    try {
      // Clean up the ticker symbol by removing market extensions if needed
      const cleanSymbol = symbol.includes('.') 
        ? `${symbol.split('.')[0]}.${symbol.split('.')[1] === 'BMV' ? 'MX' : 
           symbol.split('.')[1] === 'DEX' ? 'DE' : 
           symbol.split('.')[1] === 'LON' ? 'GB' : 
           symbol.split('.')[1] === 'MIL' ? 'IT' : 'US'}`
        : `${symbol}.US`;

      console.log(`Fetching company data from EODHD API for ${cleanSymbol}...`);
      
      const apiToken = "6824b2d80fe347.44604306"; // Your EODHD API token
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
      console.log(`EODHD API response for ${cleanSymbol}:`, data);
      
      // Check if the response has the expected data
      if (!data["General::Code"]) {
        console.error(`No valid data for ${cleanSymbol}`);
        return null;
      }
      
      return data as EODHDCompanyOverview;
    } catch (error) {
      console.error(`Error fetching company data from EODHD API for ${symbol}:`, error);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedTicker) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Determine market based on ticker
        const market = selectedTicker.includes('.BMV') ? 'Mexico' :
                      selectedTicker.includes('.DEX') ? 'XETRA' :
                      selectedTicker.includes('.LON') ? 'LSE' :
                      selectedTicker.includes('.MIL') ? 'Milan' : 'US';
        
        // Fetch data from EODHD API
        const eodhdData = await fetchCompanyDataFromEODHD(selectedTicker);
        
        if (eodhdData) {
          // Create the stockData object with EODHD data
          const stockData: StockData = {
            Ticker: selectedTicker,
            "Market Capitalization": eodhdData["Highlights::MarketCapitalization"],
            Sector: eodhdData["General::Sector"] || "N/A",
            Rating: eodhdData["AnalystRatings::Rating"] || "N/A",
            "Rated On": "Not rated",
            Price: 0, // Will be updated with daily price data
            eodhd: eodhdData,
            market: market
          };
          
          setStockData(stockData);
        } else {
          // Fallback to the old method if EODHD fails
          // Update company data
          const updateSuccess = await updateCompanyData(selectedTicker);
          if (!updateSuccess) {
            throw new Error('Failed to update company data');
          }
          
          // Get company data
          const companyData = await getCompanyData(selectedTicker);
          
          // Create the stockData object with the company data
          const stockData: StockData = {
            Ticker: selectedTicker,
            "Market Capitalization": companyData.MarketCapitalization || "N/A",
            Sector: companyData.Sector || "N/A",
            Rating: "N/A",
            "Rated On": "Not rated",
            Price: companyData["50DayMovingAverage"] || "N/A",
            overview: companyData,
            market: market
          };
          
          setStockData(stockData);
        }
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
          explanation: recommendation.explanation
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

  // Updated to use EODHD for daily prices as well
  useEffect(() => {
    const fetchDailyPrices = async () => {
      if (!selectedTicker) return;
      
      setIsLoadingPrices(true);
      try {
        // Clean up the ticker symbol by removing market extensions if needed
        const cleanSymbol = selectedTicker.includes('.') 
          ? `${selectedTicker.split('.')[0]}.${selectedTicker.split('.')[1] === 'BMV' ? 'MX' : 
             selectedTicker.split('.')[1] === 'DEX' ? 'DE' : 
             selectedTicker.split('.')[1] === 'LON' ? 'GB' : 
             selectedTicker.split('.')[1] === 'MIL' ? 'IT' : 'US'}`
          : `${selectedTicker}.US`;
          
        const apiToken = "6824b2d80fe347.44604306";
        const response = await fetch(
          `https://eodhd.com/api/eod/${cleanSymbol}?period=d&order=d&api_token=${apiToken}&fmt=json`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          // Get the most recent price for the stockData
          const latestPrice = data[0]?.close || 0;
          
          // Update stockData with the latest price
          setStockData(prevData => prevData ? {
            ...prevData,
            Price: latestPrice
          } : null);
          
          // Transform the data for the chart (limit to 30 days)
          const prices: DailyPriceData[] = data.slice(0, 30).map(item => ({
            date: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
          })).reverse(); // Reverse to have older dates first
          
          setDailyPrices(prices);
        }
      } catch (error) {
        console.error('Error fetching daily prices:', error);
        // Fallback to Alpha Vantage if EODHD fails
        try {
          const apiKey = "Z77KZQ17AVAUO1NW";
          const response = await fetch(
            `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${selectedTicker}&apikey=${apiKey}`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data["Time Series (Daily)"]) {
            const prices: DailyPriceData[] = Object.entries(data["Time Series (Daily)"])
              .map(([date, values]: [string, any]) => ({
                date,
                open: parseFloat(values["1. open"]),
                high: parseFloat(values["2. high"]),
                low: parseFloat(values["3. low"]),
                close: parseFloat(values["4. close"]),
                volume: parseInt(values["5. volume"])
              }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            setDailyPrices(prices);
          }
        } catch (fallbackError) {
          console.error('Error with fallback to Alpha Vantage:', fallbackError);
        }
      } finally {
        setIsLoadingPrices(false);
      }
    };

    fetchDailyPrices();
  }, [selectedTicker]);

  const chartData: ChartData<'line'> = {
    labels: dailyPrices.map(price => price.date),
    datasets: [
      {
        label: 'Close Price',
        data: dailyPrices.map(price => price.close),
        borderColor: '#b9d6ee',
        backgroundColor: 'rgba(185, 214, 238, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#b9d6ee',
        bodyColor: '#b9d6ee',
        borderColor: '#b9d6ee',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(185, 214, 238, 0.1)'
        },
        ticks: {
          color: '#b9d6ee'
        }
      },
      y: {
        grid: {
          color: 'rgba(185, 214, 238, 0.1)'
        },
        ticks: {
          color: '#b9d6ee'
        }
      }
    }
  };

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

  // Helper function to get data based on whether we have EODHD data or Alpha Vantage data
  const getData = (eodhdField: keyof EODHDCompanyOverview, alphaVantageField: keyof CompanyOverview) => {
    if (stockData?.eodhd && stockData.eodhd[eodhdField] !== undefined) {
      return stockData.eodhd[eodhdField];
    } else if (stockData?.overview && stockData.overview[alphaVantageField] !== undefined) {
      return stockData.overview[alphaVantageField];
    }
    return 'N/A';
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
                  <p className="text-2xl font-bold text-white mt-1">${typeof stockData.Price === 'number' ? stockData.Price.toFixed(2) : stockData.Price}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Market Cap</span>
                  <p className="text-2xl font-bold text-white mt-1">{formatMarketCap(stockData.eodhd ? stockData.eodhd["Highlights::MarketCapitalization"] : stockData.overview?.MarketCapitalization)}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
                  <span className="text-sm uppercase tracking-wider text-[#b9d6ee]/70 font-medium">Price Target</span>
                  <p className="text-2xl font-bold text-white mt-1">{stockData.eodhd ? formatCurrency(stockData.eodhd["AnalystRatings::TargetPrice"]) : (stockData.overview?.AnalystTargetPrice || 'N/A')}</p>
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
                    recommendation={aiRecommendation}
                    isLoading={false}
                    companyOverview={stockData?.overview}
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
                {isLoadingPrices ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b9d6ee]"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                )}
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