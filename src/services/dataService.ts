const ALPHA_VANTAGE_API_KEY = "Z77KZQ17AVAUO1NW";

export const updateData = async () => {
  try {
    // Aquí puedes agregar la lógica para actualizar datos específicos
    return true;
  } catch (error) {
    console.error('Error updating data:', error);
    return false;
  }
};

export const getLastUpdateTime = () => {
  return new Date().toLocaleString();
};

export const fetchStockData = async (symbol: string) => {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (data['Note']) {
      throw new Error(data['Note']);
    }

    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error('No quote data available');
    }

    return {
      symbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
      lastTradeTime: quote['07. latest trading day']
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    throw error;
  }
}; 