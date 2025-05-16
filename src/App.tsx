import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import RightPanel from './components/RightPanel';
import { updateData, getLastUpdateTime } from './services/dataService';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { updateCompanyData } from './services/companyService';
import AIAssistant from './components/AIAssistant';
import MarketReports from './components/MarketReports';
import StockTicker from './components/StockTicker';

interface StockData {
  symbol: string;
  name: string;
  market: 'US' | 'XETRA' | 'LSE' | 'TSX' | 'TSXV' | 'BSE' | 'SSE' | 'SZSE' | 'MX';
  change?: number;
  price?: number;
  loading?: boolean;
  error?: string;
}

// Interfaz para la respuesta de la API EODHD
interface EODHDResponse {
  code: string;
  timestamp: number;
  gmtoffset: number;
  open: number | any;
  high: number | any;
  low: number | any;
  close: number | any;
  volume: number | any;
  previousClose: number | any;
  change: number | any;
  change_p: number | any;
}

const stockTickers: StockData[] = [
  // US Stocks (NYSE/NASDAQ)
  { symbol: 'IBM', name: 'International Business Machines Corporation', market: 'US' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'US' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US' },
  { symbol: 'META', name: 'Meta Platforms Inc.', market: 'US' },
  { symbol: 'BRKB.BA', name: 'Berkshire Hathaway Inc.', market: 'US' },
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
  { symbol: 'MBG.XETRA', name: 'Mercedes-Benz Group AG', market: 'XETRA' },
  { symbol: 'DHER.XETRA', name: 'Deutsche Börse AG', market: 'XETRA' },
  { symbol: 'SMSN.IL', name: 'Siemens AG', market: 'XETRA' },
  { symbol: 'POAHY.US', name: 'Porsche Automobil Holding SE', market: 'XETRA' },
  { symbol: 'BMW.XETRA', name: 'BMW AG', market: 'XETRA' },
  { symbol: 'SAP.XETRA', name: 'SAP SE', market: 'XETRA' },
  
  // UK Stocks (London Stock Exchange)
  // { symbol: 'TSCO.LON', name: 'Tesco PLC', market: 'LSE' },
  { symbol: 'BT-A.LON', name: 'BT Group plc', market: 'LSE' },
  { symbol: 'HSBA.LSE', name: 'HSBC Holdings plc', market: 'LSE' },
  { symbol: 'BP.LSE', name: 'BP p.l.c.', market: 'LSE' },
  { symbol: 'VOD.LSE', name: 'Vodafone Group Plc', market: 'LSE' },
  
  // Canadian Stocks (Toronto Stock Exchange)
  { symbol: 'SHOP.TRT', name: 'Shopify Inc.', market: 'TSX' },
  { symbol: 'RY.TRT', name: 'Royal Bank of Canada', market: 'TSX' },
  { symbol: 'TD.TRT', name: 'Toronto-Dominion Bank', market: 'TSX' },
  { symbol: 'CNR.TRT', name: 'Canadian National Railway Company', market: 'TSX' },
  
  // Canadian Stocks (Toronto Venture Exchange)
  { symbol: 'GPV.TRV', name: 'GreenPower Motor Company Inc.', market: 'TSXV' },
  
  // Indian Stocks (BSE)
  { symbol: 'RELIANCE.NSE', name: 'Reliance Industries Limited', market: 'BSE' },
  { symbol: 'TCS.NSE', name: 'Tata Consultancy Services Limited', market: 'BSE' },
  { symbol: 'HDFCBANK.NSE', name: 'HDFC Bank Limited', market: 'BSE' },
  { symbol: 'INFY.NSE', name: 'Infosys Limited', market: 'BSE' },
  
  // Chinese Stocks (Shanghai Stock Exchange)
  { symbol: '600104.SHG', name: 'SAIC Motor Corporation Limited', market: 'SSE' },
  { symbol: '601318.SHG', name: 'Ping An Insurance (Group) Company of China, Ltd.', market: 'SSE' },
  { symbol: '600519.SHG', name: 'Kweichow Moutai Co., Ltd.', market: 'SSE' },
  
  // Chinese Stocks (Shenzhen Stock Exchange)
  { symbol: '000002.SHE', name: 'China Vanke Co., Ltd.', market: 'SZSE' },
  { symbol: '000651.SHE', name: 'Gree Electric Appliances Inc. of Zhuhai', market: 'SZSE' },
  { symbol: '000333.SHE', name: 'Midea Group Co., Ltd.', market: 'SZSE' },

  { symbol: 'FEMSAUB.MX', name: 'Grupo Femsa', market: 'MX' }
];

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'reports'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [stocks, setStocks] = useState<StockData[]>(stockTickers);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('No data loaded yet');
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // EODHD API Key
  const EODHD_API_KEY = "6824b2d80fe347.44604306";

  // Función para convertir el símbolo al formato de EODHD
  const formatSymbolForEODHD = (symbol: string, market: string): string => {
    // Stock US mantiene el símbolo y agrega .US
    if (market === 'US') {
      return `${symbol}.US`;
    }
    
    // Para los demás mercados, mapear según el formato requerido por EODHD
    switch (market) {
      case 'XETRA':
        return symbol.replace('.DEX', '.DE');
      case 'LSE':
        return symbol.replace('.LON', '.L');
      case 'TSX':
        return symbol.replace('.TRT', '.TO');
      case 'TSXV':
        return symbol.replace('.TRV', '.V');
      case 'BSE':
        return symbol.replace('.BSE', '.BO');
      case 'SSE':
        return symbol.replace('.SHH', '.SS');
      case 'SZSE':
        return symbol.replace('.SHG', '.SZ');
      case 'MX':
        return symbol.replace('.MX', '.MX');
      default:
        return `${symbol}.US`;
    }
  };

  const fetchStockData = async (ticker: string): Promise<StockData> => {
    try {
      const stock = stockTickers.find(s => s.symbol === ticker);
      if (!stock) {
        throw new Error('Ticker no encontrado en la lista de acciones');
      }
      
      // Formatear el símbolo para EODHD
      const formattedSymbol = formatSymbolForEODHD(stock.symbol, stock.market);
      
      // Realizar la solicitud a la API de EODHD
      const response = await fetch(`https://eodhd.com/api/real-time/${formattedSymbol}?api_token=${EODHD_API_KEY}&fmt=json`);
      const data: EODHDResponse = await response.json();
      
      if (!data || !data.code) {
        throw new Error('No se encontraron datos para este ticker');
      }

      // Actualizar el timestamp después de que la solicitud se complete exitosamente
      setLastUpdate(formatDateTime());

      // Nos aseguramos de que price y change sean números válidos
      const price = typeof data.close === 'number' && !isNaN(data.close) ? data.close : undefined;
      const change = typeof data.change_p === 'number' && !isNaN(data.change_p) ? data.change_p : undefined;

      return {
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        price,
        change,
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
      setError(null);
      
      try {
        // Inicializar stocks con la estructura básica de stockTickers antes de cargar datos
        setStocks(stockTickers.map(ticker => ({ 
          ...ticker, 
          loading: true, 
          price: undefined, 
          change: undefined
        })));
        
        const tickers = stockTickers.map(s => s.symbol);
        console.log('Starting to load data for tickers:', tickers);
        
        // Update company overview data first
        console.log('Updating company overview data...');
        await updateCompanyData(tickers.join(','));
        console.log('Company overview data updated');
        
        // Fetch stock data with delay between calls
        console.log('Fetching stock prices...');
        
        // Procesar en lotes de 5 para evitar límites de API
        const batchSize = 5;
        const results: StockData[] = [];
        
        for (let i = 0; i < tickers.length; i += batchSize) {
          const batch = tickers.slice(i, i + batchSize);
          const batchPromises = batch.map(symbol => fetchStockData(symbol));
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults.filter(result => result && !result.error));
          
          // Esperar 1 segundo entre lotes para evitar límites de API
          if (i + batchSize < tickers.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
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
      if (time) {
        setLastUpdate(new Date(time).toLocaleString());
      } else {
        setLastUpdate(new Date().toLocaleString());
      }
    } catch (error) {
      console.error('Error fetching last update time:', error);
      setLastUpdate(new Date().toLocaleString());
    }
  };

  // Función para formatear la fecha sin segundos
  const formatDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    
    return `${month}/${day}/${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  const handleStockClick = async (symbol: string) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
      setSelectedCompany(stock.name);
      setSelectedTicker(symbol);
    }
  };

  const handleCompanySelected = (company: string, ticker: string) => {
    setSelectedCompany(company);
    setSelectedTicker(ticker);
  };

  const handleUpdateData = async () => {
    try {
      setIsLoading(true);
      
      // Si hay un ticker seleccionado, actualizar sus datos
      if (selectedTicker) {
        const updatedStockData = await fetchStockData(selectedTicker);
        setStocks(prevStocks => 
          prevStocks.map(stock => 
            stock.symbol === selectedTicker ? updatedStockData : stock
          )
        );
      }

      // Actualizar todos los datos
      await updateData();
      
      // Actualizar la lista completa de stocks
      const updatedStocks = await Promise.all(
        stockTickers.map(async (stock) => {
          try {
            return await fetchStockData(stock.symbol);
          } catch (error) {
            console.error(`Error updating ${stock.symbol}:`, error);
            return stock;
          }
        })
      );

      setStocks(updatedStocks);
      toast.success('Data updated successfully!');
    } catch (error) {
      console.error('Error updating data:', error);
      toast.error('Failed to update data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportStockData = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const results: any[] = [];
      const totalStocks = stockTickers.length;
      
      for (let i = 0; i < stockTickers.length; i++) {
        const stock = stockTickers[i];
        try {
          const formattedSymbol = formatSymbolForEODHD(stock.symbol, stock.market);
          const response = await fetch(
            `https://eodhd.com/api/real-time/${formattedSymbol}?api_token=${EODHD_API_KEY}&fmt=json`
          );
          const data = await response.json();
          
          if (data.code) {
            // Agregar información adicional
            results.push({
              Symbol: stock.symbol,
              Name: stock.name,
              Market: stock.market,
              Price: data.close,
              Change: data.change,
              ChangePercent: data.change_p,
              Open: data.open,
              High: data.high,
              Low: data.low,
              Volume: data.volume,
              PreviousClose: data.previousClose,
              Timestamp: new Date(data.timestamp * 1000).toISOString()
            });
          }
        } catch (error) {
          console.error(`Error fetching data for ${stock.symbol}:`, error);
        }
        
        // Actualizar progreso
        setExportProgress(((i + 1) / totalStocks) * 100);
        
        // Esperar 1 segundo entre llamadas para evitar límites de API
        if (i < stockTickers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Convertir a CSV
      if (results.length > 0) {
        const headers = Object.keys(results[0]);
        const csvContent = [
          headers.join(','),
          ...results.map(row => 
            headers.map(header => {
              const value = row[header];
              return typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value;
            }).join(',')
          )
        ].join('\n');

        // Crear y descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `stock_data_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Data exported successfully!');
      } else {
        toast.error('No data to export. Please try again later.');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data. Please try again later.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
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
              <span className="text-sm text-[#b9d6ee]/70">
                Last chart update: {lastUpdate}
              </span>
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
                onClick={exportStockData}
                disabled={isExporting}
                className="px-4 py-2 bg-[#b9d6ee]/10 hover:bg-[#b9d6ee]/20 text-[#b9d6ee] rounded-lg border border-[#b9d6ee]/20 transition-all duration-200 flex items-center gap-2 shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                {isExporting ? `Exporting (${Math.round(exportProgress)}%)` : 'Export Data'}
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