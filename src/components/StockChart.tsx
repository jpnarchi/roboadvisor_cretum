import React, { useState, useEffect } from 'react';
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
  ChartOptions
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartDataPoint {
  date: string;
  close: number;
}

interface ChartStats {
  change: number;
  percentChange: number;
  isUp: boolean;
}

interface StockChartProps {
  ticker: string;
  companyName: string; // Añadido nombre de la empresa
}

const ALPHA_VANTAGE_API_KEY = "Z77KZQ17AVAUO1NW";

const StockChart: React.FC<StockChartProps> = ({ ticker, companyName }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartStats, setChartStats] = useState<ChartStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticker) {
      fetchChartData();
    }
  }, [ticker]);

  const fetchChartData = async () => {
    try {
      console.log(`Fetching chart data for ${ticker}...`);
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.Note) {
        console.error('API Error:', data.Note);
        return null;
      }
      
      if (!data['Time Series (Daily)']) {
        console.error('No time series data found');
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return null;
    }
  };

  // Calcular estadísticas del gráfico
  const updateChartStats = (data: ChartDataPoint[]) => {
    if (data.length === 0) {
      setChartStats(null);
      return;
    }

    const quote = data[0];
    const change = parseFloat(quote.close.toString()) - parseFloat(quote.close.toString());
    const percentChange = 0;
    const isUp = change >= 0;

    setChartStats({
      change,
      percentChange,
      isUp
    });
  };

  // Configuración del gráfico
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#b9d6ee',
        bodyColor: '#b9d6ee',
        borderColor: '#b9d6ee',
        borderWidth: 1,
        padding: 8,
        displayColors: false,
        titleFont: {
          size: 10
        },
        bodyFont: {
          size: 10
        }
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        display: false,
        min: chartData.length > 0 ? Math.min(...chartData.map(d => d.close)) * 0.99 : undefined,
        max: chartData.length > 0 ? Math.max(...chartData.map(d => d.close)) * 1.01 : undefined
      }
    }
  };

  // Datos para el gráfico
  const data = {
    labels: chartData.map(d => d.date),
    datasets: [
      {
        label: ticker,
        data: chartData.map(d => d.close),
        borderColor: chartStats?.isUp ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)',
        backgroundColor: chartStats?.isUp ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#b9d6ee]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-32 text-red-400 text-sm">
        <p>{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-32 text-[#b9d6ee]/50 text-sm">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="h-32 w-32"> {/* Ancho reducido de 40 a 32 */}
      <div className="flex flex-col mb-2">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#b9d6ee]">{ticker}</span>
            <span className="text-xs text-[#b9d6ee]/70 truncate max-w-24">{companyName}</span> {/* Añadido el nombre de la empresa */}
          </div>
          {chartStats && (
            <div className={`flex flex-col items-end ${chartStats.isUp ? 'text-green-400' : 'text-red-400'}`}>
              <span className="text-xs">
                ({chartStats.percentChange.toFixed(2)}%)
              </span>
              <span className="text-sm font-medium">
                ${chartData[0].close.toFixed(2)} {/* Precio colocado debajo del porcentaje */}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="h-20">
        <Line options={options} data={data} />
      </div>
    </div>
  );
};

export default StockChart;