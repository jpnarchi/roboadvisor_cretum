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
  Filler
} from 'chart.js';

// Registrar los componentes necesarios
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_TOKEN = '6824b2d80fe347.44604306';

interface StockChartProps {
  symbol: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension: number;
  }[];
}

const StockChart: React.FC<StockChartProps> = ({ symbol }) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const cleanSymbol = symbol.includes('.') 
          ? `${symbol.split('.')[0]}.${symbol.split('.')[1] === 'BMV' ? 'MX' : 
             symbol.split('.')[1] === 'DEX' ? 'DE' : 
             symbol.split('.')[1] === 'LON' ? 'GB' : 
             symbol.split('.')[1] === 'MIL' ? 'IT' : 'US'}`
          : `${symbol}.US`;

        // Get dates for last year
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const fromDate = startDate.toISOString().split('T')[0];
        const toDate = endDate.toISOString().split('T')[0];

        const response = await fetch(
          `https://eodhd.com/api/eod/${cleanSymbol}?from=${fromDate}&to=${toDate}&api_token=${API_TOKEN}&fmt=json`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
          throw new Error('No se encontraron datos para este símbolo');
        }

        // Sort data by date (newest first)
        const sortedData = data.sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const dates = sortedData.map((item: any) => {
          const date = new Date(item.date);
          return date.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit'
          });
        });

        const prices = sortedData.map((item: any) => Number(item.close));

        setChartData({
          labels: dates,
          datasets: [
            {
              label: `${symbol} - Precio de cierre`,
              data: prices,
              borderColor: '#b9d6ee',
              backgroundColor: 'rgba(185, 214, 238, 0.1)',
              fill: true,
              tension: 0.4
            }
          ]
        });
      } catch (error: any) {
        console.error('Error al obtener datos:', error);
        setError(error.message || 'Error al cargar los datos');
      } finally {
        setIsLoading(false);
      }
    };

    if (symbol) {
      fetchData();
    }
  }, [symbol]);

  // Configuraciones del gráfico
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
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `Precio: $${context.raw.toFixed(2)}`;
          }
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        position: 'right' as const,
        grid: {
          color: 'rgba(185, 214, 238, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value;
          },
          font: {
            size: 12
          },
          color: '#b9d6ee'
        },
        title: {
          display: true,
          text: 'Precio ($)',
          font: {
            size: 14
          },
          color: '#b9d6ee'
        }
      },
      x: {
        grid: {
          color: 'rgba(185, 214, 238, 0.1)'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 20,
          font: {
            size: 10
          },
          color: '#b9d6ee'
        },
        title: {
          display: true,
          text: 'Fecha',
          font: {
            size: 14
          },
          color: '#b9d6ee'
        }
      }
    },
    elements: {
      line: {
        tension: 0.1 // Menos suavizado para mostrar mejor las fluctuaciones
      }
    },
    animation: {
      duration: 1500 // Animación al cargar
    },
    color: '#b9d6ee'
  };

  // Renderizado condicional
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-black rounded-lg">
        <p className="text-[#b9d6ee] font-semibold">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-black rounded-lg">
        <div className="text-center px-4">
          <p className="text-red-500 font-semibold">{error}</p>
          <p className="text-[#b9d6ee] mt-2">Símbolo: {symbol}</p>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64 bg-black rounded-lg">
        <div className="text-center px-4">
          <p className="text-[#b9d6ee] font-semibold">No hay datos disponibles</p>
          <p className="text-[#b9d6ee] mt-2">Símbolo: {symbol}</p>
        </div>
      </div>
    );
  }

  // Registrar información para depuración
  console.log(`Renderizando gráfico con ${chartData.datasets[0].data.length} puntos de datos`);

  return (
    <div className="h-64 w-full bg-black rounded-lg shadow p-4">
      <Line 
        data={chartData} 
        options={chartOptions}
      />
    </div>
  );
};

export default StockChart;