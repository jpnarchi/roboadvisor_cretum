const ALPHA_VANTAGE_API_KEY = "Z77KZQ17AVAUO1NW";

export const updateCompanyData = async (symbol: string) => {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    // Guardar los datos en localStorage para caché
    localStorage.setItem(`company_${symbol}`, JSON.stringify({
      data,
      timestamp: new Date().getTime()
    }));

    return true;
  } catch (error) {
    console.error(`Error updating company data for ${symbol}:`, error);
    return false;
  }
};

export const getCompanyData = async (symbol: string) => {
  try {
    // Intentar obtener datos del caché primero
    const cachedData = localStorage.getItem(`company_${symbol}`);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      const now = new Date().getTime();
      if (now - timestamp < 5 * 60 * 1000) { // 5 minutos de caché
        return data;
      }
    }

    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    // Guardar en caché
    localStorage.setItem(`company_${symbol}`, JSON.stringify({
      data,
      timestamp: new Date().getTime()
    }));

    return data;
  } catch (error) {
    console.error(`Error getting company data for ${symbol}:`, error);
    throw error;
  }
}; 