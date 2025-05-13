import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StockData {
  symbol: string;
  name: string;
  change?: number;
  price?: number;
  loading?: boolean;
  error?: string;
}

interface StockTickerProps {
  stocks: StockData[];
  onStockClick: (symbol: string) => void;
  error: string | null;
}

const StockTicker: React.FC<StockTickerProps> = ({ stocks, onStockClick, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  // Duplicar los stocks para el carrusel infinito
  const duplicatedStocks = [...stocks, ...stocks, ...stocks];

  const startAutoScroll = () => {
    if (autoScrollRef.current) return;
    
    autoScrollRef.current = window.setInterval(() => {
      if (sliderRef.current && !isDragging) {
        sliderRef.current.scrollLeft += 1;
        
        // Reset scroll position when reaching the end
        if (sliderRef.current.scrollLeft >= sliderRef.current.scrollWidth - sliderRef.current.clientWidth) {
          sliderRef.current.scrollLeft = 0;
        }
      }
    }, 30);
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  };

  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    stopAutoScroll();
    if (sliderRef.current) {
      setStartX(e.pageX - sliderRef.current.offsetLeft);
      setScrollLeft(sliderRef.current.scrollLeft);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    startAutoScroll();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    if (sliderRef.current) {
      const x = e.pageX - sliderRef.current.offsetLeft;
      const walk = (x - startX) * 2;
      sliderRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      startAutoScroll();
    }
  };

  return (
    <div className="glass-panel mt-4 mx-4 overflow-hidden">
      <div className="py-3">
        {error ? (
          <div className="error-message p-4 text-center">
            <h3 className="text-lg font-bold mb-2">API Key Required</h3>
            <p className="text-sm mb-4">{error}</p>
            <p className="text-sm mb-2">To get an API key:</p>
            <ol className="text-sm list-decimal list-inside">
              <li>Visit <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Alpha Vantage</a></li>
              <li>Sign up for a free API key</li>
              <li>Create a .env file in the root directory</li>
            </ol>
          </div>
        ) : (
          <div 
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ 
              scrollBehavior: isDragging ? 'auto' : 'smooth',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {duplicatedStocks.map((stock, index) => (
              <button
                key={`${stock.symbol}-${index}`}
                onClick={() => onStockClick(stock.symbol)}
                className="glass-panel w-46 p-3 hover:bg-white/5 transition-colors flex-shrink-0 button-glow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="text-lg font-bold text-[#b9d6ee]">{stock.symbol}</div>
                    <div className="text-xs text-[#b9d6ee]/70 truncate max-w-20">{stock.name}</div>
                  </div>
                  
                  {stock.loading ? (
                    <div className="animate-pulse bg-[#b9d6ee]/20 h-4 w-16 rounded"></div>
                  ) : stock.error ? (
                    <div className="text-xs text-red-400">Error</div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockTicker; 