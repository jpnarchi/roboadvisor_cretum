import React, { useEffect, useState } from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface StockChartProps {
  symbol: string;
}

interface SMAData {
  date: string;
  sma: number;
}

const StockChart: React.FC<StockChartProps> = ({ symbol }) => {
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: [
      {
        label: 'SMA 50',
        data: [],
        borderColor: '#b9d6ee',
        backgroundColor: 'rgba(185, 214, 238, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Obtener la fecha de ayer y la fecha de hace un año
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // Ayer
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Hace un año

        // Formatear las fechas para la API
        const fromDate = startDate.toISOString().split('T')[0];
        const toDate = endDate.toISOString().split('T')[0];

        // Construir la URL de la API
        const apiUrl = `https://eodhd.com/api/technical/${symbol}.US?order=d&from=${fromDate}&to=${toDate}&function=sma&period=50&api_token=6824b2d80fe347.44604306&fmt=json`;
        
        console.log('Fetching data from:', apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: SMAData[] = await response.json();
        console.log('Received data:', data);
        
        if (!data || data.length === 0) {
          throw new Error('No data received from API');
        }
        
        // Ordenar los datos por fecha (más reciente primero)
        const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setChartData({
          labels: sortedData.map(item => item.date),
          datasets: [
            {
              label: 'SMA 50',
              data: sortedData.map(item => item.sma),
              borderColor: '#b9d6ee',
              backgroundColor: 'rgba(185, 214, 238, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }
          ]
        });
      } catch (error) {
        console.error('Error fetching stock data:', error);
        setError(error instanceof Error ? error.message : 'Error fetching data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

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
          color: '#b9d6ee',
          maxRotation: 45,
          minRotation: 45
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

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-[#b9d6ee]">Loading chart data...</div>;
  }

  if (error) {
    return <div className="h-64 flex items-center justify-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="h-64 w-full">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default StockChart;