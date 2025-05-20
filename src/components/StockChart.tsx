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
} from 'chart.js';

// Registrar los componentes necesarios
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

const StockChart: React.FC<StockChartProps> = ({ symbol }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: '',
        data: [],
        borderColor: '#b9d6ee', // Azul celeste
        backgroundColor: 'rgba(185, 214, 238, 0.1)', // Azul celeste con transparencia
        borderWidth: 1.5,
        pointRadius: 1, // Puntos más pequeños ya que hay muchos
        pointHoverRadius: 5,
        pointBackgroundColor: '#b9d6ee',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 1.5,
      }
    ]
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) {
        setError('No se ha proporcionado un símbolo');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Configurar fechas para 3 años atrás
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const fromDate = startDate.toISOString().split('T')[0];
        const toDate = endDate.toISOString().split('T')[0];

        // Registrar la consulta para depuración
        console.log(`Fetching data for ${symbol} from ${fromDate} to ${toDate}`);

        // Hacer la solicitud a la API
        const apiUrl = `https://eodhd.com/api/eod/${symbol}.US?order=a&from=${fromDate}&to=${toDate}&api_token=6824b2d80fe347.44604306&fmt=json`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        // Obtener y procesar los datos
        const data = await response.json();
        console.log(`Received ${data.length} data points`);
        
        if (!data || data.length === 0) {
          throw new Error('No se recibieron datos de la API');
        }

        // Transformar los datos directamente, sin agrupación por mes
        const prices = data.map((item: { close: string | number }) => Number(item.close));
        const dates = data.map((item: { date: string }) => {
          const date = new Date(item.date);
          return date.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit'
          });
        });

        // Confirmar que tenemos datos válidos
        console.log(`Precios: ${prices.length} puntos, Rango: ${Math.min(...prices)} - ${Math.max(...prices)}`);

        // Actualizar los datos del gráfico
        setChartData({
          labels: dates,
          datasets: [
            {
              label: '',
              data: prices,
              borderColor: '#b9d6ee',
              backgroundColor: 'rgba(185, 214, 238, 0.1)',
              borderWidth: 1.5,
              pointRadius: 1,
              pointHoverRadius: 5,
              pointBackgroundColor: '#b9d6ee',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 1.5,
            }
          ]
        });
      } catch (error) {
        console.error('Error al obtener datos:', error);
        setError(error instanceof Error ? error.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  if (!chartData.labels.length || !chartData.datasets[0].data.length) {
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