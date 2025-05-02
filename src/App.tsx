import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import RightPanel from './components/RightPanel';
import { updateData, getLastUpdateTime } from './services/dataService';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { updateCompanyData, getCompanyData } from './services/companyService';
import AIAssistant from './components/AIAssistant';

interface StockData {
  symbol: string;
  name: string;
  change?: number;
  price?: number;
  loading?: boolean;
  error?: string;
}

const stockTickers: StockData[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'MA', name: 'Mastercard Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble Co.' },
  { symbol: 'HD', name: 'Home Depot Inc.' },
  { symbol: 'BAC', name: 'Bank of America Corp.' }
];

const infiniteStockTickers = [...stockTickers, ...stockTickers];

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'reports'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [stocks, setStocks] = useState<StockData[]>(stockTickers);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition(prev => {
        const newPosition = prev + 1;
        if (newPosition >= stocks.length) {
          return 0;
        }
        return newPosition;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [stocks.length]);

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

  const fetchStockData = async (symbol: string) => {
    try {
      const apiKey = "Z77KZQ17AVAUO1NW";
      
      // Intentar obtener datos del caché primero
      const cachedData = localStorage.getItem(`stock_${symbol}`);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const now = new Date().getTime();
        if (now - timestamp < 5 * 60 * 1000) { // 5 minutos de caché para datos de acciones
          return {
            symbol,
            name: stockTickers.find(s => s.symbol === symbol)?.name || '',
            price: parseFloat(data['05. price']),
            change: parseFloat(data['10. change percent'].replace('%', '')),
            loading: false
          };
        }
      }

      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Verificar si hay un mensaje de error de la API
      if (data.Note) {
        console.warn(`API Note for ${symbol}:`, data.Note);
        throw new Error(data.Note);
      }

      if (!data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
        console.warn(`No Global Quote data for ${symbol}`);
        return {
          symbol,
          name: stockTickers.find(s => s.symbol === symbol)?.name || '',
          loading: false,
          error: 'No data available'
        };
      }

      const quote = data['Global Quote'];
      
      // Guardar en caché
      localStorage.setItem(`stock_${symbol}`, JSON.stringify({
        data: quote,
        timestamp: new Date().getTime()
      }));

      return {
        symbol,
        name: stockTickers.find(s => s.symbol === symbol)?.name || '',
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['10. change percent'].replace('%', '')),
        loading: false
      };
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return {
        symbol,
        name: stockTickers.find(s => s.symbol === symbol)?.name || '',
        loading: false,
        error: 'Error fetching data'
      };
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
        const companyData = await updateCompanyData(tickers);
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
          setStocks([]);
          setError('Error fetching stock data. Please try again later.');
        } else {
          setStocks(results);
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
    // Esta función ahora se manejará en el componente AIAssistant
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

  // Duplicar los stocks para el carrusel infinito
  const duplicatedStocks = [...stocks, ...stocks, ...stocks];

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

        <div className="glass-panel mt-4 mx-4 overflow-hidden">
          <div className="py-3">
            {isLoadingStocks ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b9d6ee]"></div>
              </div>
            ) : (
              <div 
                className="flex gap-4 transition-transform duration-1000"
                style={{ 
                  transform: `translateX(-${scrollPosition * 200}px)`,
                  width: 'fit-content'
                }}
              >
                {error ? (
                  <div className="error-message">
                    <h3>API Key Required</h3>
                    <p>{error}</p>
                    <p>To get an API key:</p>
                    <ol>
                      <li>Visit <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer">Alpha Vantage</a></li>
                      <li>Sign up for a free API key</li>
                      <li>Create a .env file in the root directory</li>
                    </ol>
                  </div>
                ) : (
                  duplicatedStocks.map((stock, index) => (
                    <button
                      key={`${stock.symbol}-${index}`}
                      onClick={() => handleStockClick(stock.symbol)}
                      className="glass-panel w-46 p-3 hover:bg-white/5 transition-colors flex-shrink-0 button-glow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <div className="text-lg font-bold text-[#b9d6ee]">{stock.symbol}</div>
                          <div className="text-xs text-[#b9d6ee]/70 truncate max-w-20">{stock.name}</div>
                        </div>
                        
                        {stock.loading ? (
                          <div className="animate-pulse bg-[#b9d6ee]/20 h-4 w-16 rounded"></div>
                        ) : (
                          <div className="flex flex-col items-end">
                            {stock.change !== undefined ? (
                              <div className={`flex items-center text-xs ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stock.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                <span className="ml-1">{Math.abs(stock.change).toFixed(2)}%</span>
                              </div>
                            ) : (
                              <div className="text-xs text-[#b9d6ee]/50">N/A</div>
                            )}
                            
                            {stock.price !== undefined ? (
                              <div className="text-sm font-medium text-[#b9d6ee]">${stock.price.toFixed(2)}</div>
                            ) : (
                              <div className="text-xs text-[#b9d6ee]/50">N/A</div>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {currentView === 'dashboard' ? (
          <div className="flex flex-1 gap-4 p-4 overflow-hidden">
            <AIAssistant 
              onCompanySelected={handleCompanySelected} 
              stocks={stocks} 
            />

            <RightPanel selectedCompany={selectedCompany} selectedTicker={selectedTicker} />
          </div>
        ) : (
          <div className="flex-1 p-4">
            <div className="glass-panel p-6 max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#b9d6ee] mb-4">Market Reports</h2>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by stock symbol, report type, or date..."
                    className="w-full glass-panel px-4 py-3 pl-12 focus:outline-none focus:ring-2 focus:ring-[#b9d6ee] text-[#b9d6ee] placeholder-[#b9d6ee]/50"
                  />
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-[#b9d6ee]/50" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass-panel p-8 text-center">
                  <p className="text-[#b9d6ee]/70 mb-2">No reports found</p>
                  <p className="text-sm text-[#b9d6ee]/50">Try adjusting your search criteria</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;