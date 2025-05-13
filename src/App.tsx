import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import RightPanel from './components/RightPanel';
import { updateData, getLastUpdateTime } from './services/dataService';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { updateCompanyData, getCompanyData } from './services/companyService';
import AIAssistant from './components/AIAssistant';
import MarketReports from './components/MarketReports';
import StockTicker from './components/StockTicker';

interface StockData {
  symbol: string;
  name: string;
  market: 'US' | 'XETRA' | 'LSE' | 'TSX' | 'TSXV' | 'BSE' | 'SSE' | 'SZSE';
  change?: number;
  price?: number;
  loading?: boolean;
  error?: string;
}

const stockTickers: StockData[] = [
  // US Stocks (NYSE/NASDAQ)
  { symbol: 'IBM', name: 'International Business Machines Corporation', market: 'US' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'US' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US' },
  { symbol: 'META', name: 'Meta Platforms Inc.', market: 'US' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', market: 'US' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', market: 'US' },
  { symbol: 'TCEHY', name: 'Tencent Holdings Ltd.', market: 'US' },
  { symbol: 'BABA', name: 'Alibaba Group Holding Ltd.', market: 'US' },
  { symbol: 'LVMUY', name: 'LVMH Moët Hennessy Louis Vuitton', market: 'US' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', market: 'US' },
  { symbol: 'RTX', name: 'Raytheon Technologies Corporation', market: 'US' },
  { symbol: 'LMT', name: 'Lockheed Martin Corporation', market: 'US' },
  { symbol: 'INTC', name: 'Intel Corporation', market: 'US' },
  { symbol: 'ABNB', name: 'Airbnb Inc.', market: 'US' },
  { symbol: 'RSP', name: 'Invesco S&P 500 Equal Weight ETF', market: 'US' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', market: 'US' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', market: 'US' },
  { symbol: 'BIDU', name: 'Baidu Inc.', market: 'US' },
  { symbol: 'EL', name: 'Estée Lauder Companies Inc.', market: 'US' },
  { symbol: 'PINS', name: 'Pinterest Inc.', market: 'US' },
  { symbol: 'PARA', name: 'Paramount Global', market: 'US' },
  { symbol: 'QLD', name: 'ProShares Ultra QQQ', market: 'US' },
  { symbol: 'DJT', name: 'DJT Corporation', market: 'US' },
  { symbol: 'TMF', name: 'Direxion Daily 20+ Year Treasury Bull 3x Shares', market: 'US' },
  { symbol: 'EWZ', name: 'iShares MSCI Brazil ETF', market: 'US' },
  
  // German Stocks (XETRA)
  { symbol: 'MBG.DEX', name: 'Mercedes-Benz Group AG', market: 'XETRA' },
  { symbol: 'DHER.DEX', name: 'Deutsche Börse AG', market: 'XETRA' },
  { symbol: 'SMSN.DEX', name: 'Siemens AG', market: 'XETRA' },
  { symbol: 'POAHY.DEX', name: 'Porsche Automobil Holding SE', market: 'XETRA' },
  { symbol: 'BMW.DEX', name: 'BMW AG', market: 'XETRA' },
  { symbol: 'SAP.DEX', name: 'SAP SE', market: 'XETRA' },
  
  // UK Stocks (London Stock Exchange)
  { symbol: 'TSCO.LON', name: 'Tesco PLC', market: 'LSE' },
  { symbol: 'BT.A.LON', name: 'BT Group plc', market: 'LSE' },
  { symbol: 'HSBA.LON', name: 'HSBC Holdings plc', market: 'LSE' },
  { symbol: 'BP.LON', name: 'BP p.l.c.', market: 'LSE' },
  { symbol: 'VOD.LON', name: 'Vodafone Group Plc', market: 'LSE' },
  
  // Canadian Stocks (Toronto Stock Exchange)
  { symbol: 'SHOP.TRT', name: 'Shopify Inc.', market: 'TSX' },
  { symbol: 'RY.TRT', name: 'Royal Bank of Canada', market: 'TSX' },
  { symbol: 'TD.TRT', name: 'Toronto-Dominion Bank', market: 'TSX' },
  { symbol: 'CNR.TRT', name: 'Canadian National Railway Company', market: 'TSX' },
  
  // Canadian Stocks (Toronto Venture Exchange)
  { symbol: 'GPV.TRV', name: 'GreenPower Motor Company Inc.', market: 'TSXV' },
  
  // Indian Stocks (BSE)
  { symbol: 'RELIANCE.BSE', name: 'Reliance Industries Limited', market: 'BSE' },
  { symbol: 'TCS.BSE', name: 'Tata Consultancy Services Limited', market: 'BSE' },
  { symbol: 'HDFCBANK.BSE', name: 'HDFC Bank Limited', market: 'BSE' },
  { symbol: 'INFY.BSE', name: 'Infosys Limited', market: 'BSE' },
  
  // Chinese Stocks (Shanghai Stock Exchange)
  { symbol: '600104.SHH', name: 'SAIC Motor Corporation Limited', market: 'SSE' },
  { symbol: '601318.SHH', name: 'Ping An Insurance (Group) Company of China, Ltd.', market: 'SSE' },
  { symbol: '600519.SHH', name: 'Kweichow Moutai Co., Ltd.', market: 'SSE' },
  
  // Chinese Stocks (Shenzhen Stock Exchange)
  { symbol: '000002.SHZ', name: 'China Vanke Co., Ltd.', market: 'SZSE' },
  { symbol: '000651.SHZ', name: 'Gree Electric Appliances Inc. of Zhuhai', market: 'SZSE' },
  { symbol: '000333.SHZ', name: 'Midea Group Co., Ltd.', market: 'SZSE' }
];


function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'reports'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stocks, setStocks] = useState<StockData[]>(stockTickers);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const generateSampleStockData = (symbol: string) => {
    const basePrice = 100 + Math.random() * 900;
    const change = (Math.random() * 10 - 5).toFixed(2);
    return {
      symbol,
      name: stockTickers.find(s => s.symbol === symbol)?.name || '',
      price: basePrice,
      change: parseFloat(change),
      loading: false
    };
  };

  const fetchStockData = async (ticker: string) => {
    try {
      const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&apikey=demo`);
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      const timeSeriesData = data['Time Series (Daily)'];
      if (!timeSeriesData) {
        throw new Error('No se encontraron datos para este ticker');
      }

      const dates = Object.keys(timeSeriesData);
      const latestDate = dates[0];
      const previousDate = dates[1];

      const latestPrice = parseFloat(timeSeriesData[latestDate]['4. close']);
      const previousPrice = parseFloat(timeSeriesData[previousDate]['4. close']);
      const change = ((latestPrice - previousPrice) / previousPrice) * 100;

      const stock = stockTickers.find(s => s.symbol === ticker);
      if (!stock) {
        throw new Error('Ticker no encontrado en la lista de acciones');
      }

      return {
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        price: latestPrice,
        change: change,
        loading: false
      } as StockData;
    } catch (error) {
      const stock = stockTickers.find(s => s.symbol === ticker);
      if (!stock) {
        throw new Error('Ticker no encontrado en la lista de acciones');
      }
      return {
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      } as StockData;
    }
  };

  useEffect(() => {
    const loadAllStocks = async () => {
      setIsLoadingStocks(true);
      setError(null);
      
      try {
        const tickers = stockTickers.map(s => s.symbol);
        console.log('Starting to load data for tickers:', tickers);
        
        // Update company overview data first
        console.log('Updating company overview data...');
        const companyData = await updateCompanyData(tickers.join(','));
        console.log('Company overview data updated');
        
        // Fetch stock data with delay between calls
        console.log('Fetching stock prices...');
        
        // Procesar en lotes de 3 para evitar límites de API
        const batchSize = 3;
        const results: StockData[] = [];
        
        for (let i = 0; i < tickers.length; i += batchSize) {
          const batch = tickers.slice(i, i + batchSize);
          const batchPromises = batch.map(symbol => fetchStockData(symbol));
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults.filter(result => result && !result.error));
          
          // Esperar 12 segundos entre lotes para evitar límites de API
          if (i + batchSize < tickers.length) {
            await new Promise(resolve => setTimeout(resolve, 12000));
          }
        }
        
        if (results.length === 0) {
          setError('Error fetching stock data. Please try again later.');
        } else {
          // Actualizar solo los datos que han cambiado
          setStocks(prevStocks => {
            const updatedStocks = prevStocks.map(prevStock => {
              const newData = results.find(r => r.symbol === prevStock.symbol);
              if (newData) {
                return {
                  ...prevStock,
                  price: newData.price,
                  change: newData.change,
                  loading: newData.loading,
                  error: newData.error
                };
              }
              return prevStock;
            });
            return updatedStocks;
          });
          setError(null);
          console.log('Successfully loaded stock data for', results.length, 'stocks');
        }
      } catch (error) {
        console.error('Error loading stocks:', error);
        setError('Error loading stock data. Please try again later.');
      } finally {
        setIsLoadingStocks(false);
      }
    };

    loadAllStocks();
  }, []);

  useEffect(() => {
    fetchLastUpdate();
  }, []);

  const fetchLastUpdate = async () => {
    try {
      const time = await getLastUpdateTime();
      setLastUpdate(time);
    } catch (error) {
      console.error('Error fetching last update time:', error);
    }
  };

  const handleUpdateData = async () => {
    try {
      await updateData();
      const newLastUpdate = await getLastUpdateTime();
      setLastUpdate(newLastUpdate);
      toast.success('Data updated successfully!');
    } catch (error) {
      toast.error('Failed to update data. Please try again later.');
    }
  };

  const handleStockClick = async (symbol: string) => {
    if (isLoading) return;
    const analysisPrompt = `Dame un análisis de ${symbol}`;
    setSelectedTicker(symbol);
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
      setSelectedCompany(stock.name);
    }
  };

  const handleCompanySelected = (company: string, ticker: string) => {
    setSelectedCompany(company);
    setSelectedTicker(ticker);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="flex flex-col h-screen bg-black text-[#b9d6ee]">
        <header className="glass-panel px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <img src="/menlog.svg" alt="CRETUM Partners Logo" className="h-12 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-[#b9d6ee]">Robo Advisor</h1>
                <p className="text-sm text-[#b9d6ee]">Passion Beyond Money</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <span className="text-sm text-[#b9d6ee]/70">
                  Last updated: {new Date(lastUpdate).toLocaleString()}
                </span>
              )}
              <button
                onClick={() => handleUpdateData()}
                className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b9d6ee] text-[#b9d6ee]"
                title="Update Data"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg button-glow ${
                  currentView === 'dashboard' 
                    ? 'bg-[#b9d6ee] text-black' 
                    : 'bg-black/50 text-[#b9d6ee] hover:text-white'
                }`}
              >
                Panel
              </button>
              <button 
                onClick={() => setCurrentView('reports')}
                className={`px-4 py-2 rounded-lg button-glow ${
                  currentView === 'reports' 
                    ? 'bg-[#b9d6ee] text-black' 
                    : 'bg-black/50 text-[#b9d6ee] hover:text-white'
                }`}
              >
                Reports
              </button>
            </div>
          </div>
        </header>

        <StockTicker 
          stocks={stocks}
          onStockClick={handleStockClick}
          error={error}
        />

        {currentView === 'dashboard' ? (
          <div className="flex flex-1 gap-4 p-4 overflow-hidden">
            <AIAssistant 
              onCompanySelected={handleCompanySelected} 
              stocks={stocks} 
            />
            <RightPanel selectedCompany={selectedCompany} selectedTicker={selectedTicker} />
          </div>
        ) : (
          <MarketReports 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
      </div>
    </div>
  );
}

export default App;