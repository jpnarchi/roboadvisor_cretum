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

        // Construir la URL de la API - IMPORTANTE: Cambiado a order=a (ascendente)
        const apiUrl = `https://eodhd.com/api/technical/${symbol}.US?order=a&from=${fromDate}&to=${toDate}&function=sma&period=50&api_token=6824b2d80fe347.44604306&fmt=json`;
        
        console.log('Fetching data from:', apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: SMAData[] = await response.json();
        console.log('Received data length:', data.length);
        
        if (!data || data.length === 0) {
          throw new Error('No data received from API');
        }
        
        // Crear un array con fechas ya parseadas para mejor ordenamiento
        const dataWithParsedDates = data.map(item => ({
          ...item,
          parsedDate: new Date(item.date)
        }));
        
        // IMPORTANTE: Ordenar explícitamente por fecha (de más antiguo a más reciente)
        // Esto es crucial para asegurar que el ordenamiento sea correcto
        const sortedData = [...dataWithParsedDates].sort(
          (a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()
        );
        
        // Imprimir la primera y última fecha para verificar
        if (sortedData.length > 0) {
          console.log('First date:', sortedData[0].date);
          console.log('Last date:', sortedData[sortedData.length - 1].date);
        }
        
        // Formatear fechas para mejor visualización en el gráfico
        
        // Detectar y eliminar valores extremos que podrían distorsionar el gráfico
        const values = sortedData.map(item => item.sma);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const stdDev = Math.sqrt(
          values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
        );
        
        // Filtrar valores que están a más de 3 desviaciones estándar
        const threshold = 3 * stdDev;
        const filteredData = sortedData.filter(
          item => Math.abs(item.sma - mean) <= threshold
        );
        
        console.log(`Filtered out ${sortedData.length - filteredData.length} outliers`);
        
        // IMPORTANTE: Crear un nuevo array de labels que corresponda a los datos filtrados
        const filteredLabels = filteredData.map(item => {
          const date = item.parsedDate;
          return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().substring(2)}`;
        });
        
        setChartData({
          // Usar los labels filtrados
          labels: filteredLabels,
          datasets: [
            {
              label: 'SMA 50',
              // Usar solo los valores de los datos filtrados
              data: filteredData.map(item => item.sma),
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
          minRotation: 45,
          // Mostrar un número limitado de etiquetas para evitar superposición
          maxTicksLimit: 8,
          callback: function(tickValue: number | string, index: number): string {
            // Solo mostrar algunas etiquetas para evitar aglomeración
            return index % 3 === 0 ? tickValue.toString() : '';
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(185, 214, 238, 0.1)'
        },
        ticks: {
          color: '#b9d6ee'
        },
        // Asegurar que la escala comience desde cero
        beginAtZero: true
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