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

const StockChart: React.FC<StockChartProps> = ({ symbol }) => {
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: [
      {
        label: 'Close Price',
        data: [],
        borderColor: '#b9d6ee',
        backgroundColor: 'rgba(185, 214, 238, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/stock-data?symbol=${symbol}`);
        const data = await response.json();
        
        setChartData({
          labels: data.labels,
          datasets: [
            {
              label: 'Close Price',
              data: data.values,
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
      }
    };

    if (symbol) {
      fetchData();
    }
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

  return (
    <div className="h-64">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default StockChart;