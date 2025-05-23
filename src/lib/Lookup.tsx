import { StockData, Market } from '../types/stock';

// Stock tickers array from App.tsx to get market info
export const filters = [

    "General::Code",
    "General::Sector",
    "Highlights::MarketCapitalization",
    "Valuation::TrailingPE",
    "Valuation::PriceBookMRQ",
    "SplitsDividends::ForwardAnnualDividendYield",
    "Technicals::Beta",
    "Highlights::ReturnOnAssetsTTM",
    "Highlights::ReturnOnEquityTTM",
    "AnalystRatings::TargetPrice",
    "SplitsDividends::ExDividendDate",
    "AnalystRatings::Rating",
    "AnalystRatings::StrongBuy",
    "AnalystRatings::Buy",
    "AnalystRatings::Hold",
    "AnalystRatings::Sell",
    "AnalystRatings::StrongSell"
  ].join(",");

const stockTickers: StockData[] = [
    // US Stocks (NYSE/NASDAQ)
    { symbol: 'IBM', name: 'International Business Machines Corporation', market: 'US' as Market },
    { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US' as Market },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'US' as Market },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US' as Market },
    { symbol: 'META', name: 'Meta Platforms Inc.', market: 'US' as Market },
    { symbol: 'BRKB.BA', name: 'Berkshire Hathaway Inc.', market: 'US' as Market },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', market: 'US' as Market },
    { symbol: 'TCEHY', name: 'Tencent Holdings Ltd.', market: 'US' as Market },
    { symbol: 'BABA', name: 'Alibaba Group Holding Ltd.', market: 'US' as Market },
    { symbol: 'LVMUY', name: 'LVMH Moët Hennessy Louis Vuitton', market: 'US' as Market },
    { symbol: 'UBER', name: 'Uber Technologies Inc.', market: 'US' as Market },
    { symbol: 'RTX', name: 'Raytheon Technologies Corporation', market: 'US' as Market },
    { symbol: 'LMT', name: 'Lockheed Martin Corporation', market: 'US' as Market },
    { symbol: 'INTC', name: 'Intel Corporation', market: 'US' as Market },
    { symbol: 'ABNB', name: 'Airbnb Inc.', market: 'US' as Market },
    { symbol: 'RSP', name: 'Invesco S&P 500 Equal Weight ETF', market: 'US' as Market },
    { symbol: 'COIN', name: 'Coinbase Global Inc.', market: 'US' as Market },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', market: 'US' as Market },
    { symbol: 'BIDU', name: 'Baidu Inc.', market: 'US' as Market },
    { symbol: 'EL', name: 'Estée Lauder Companies Inc.', market: 'US' as Market },
    { symbol: 'PINS', name: 'Pinterest Inc.', market: 'US' as Market },
    { symbol: 'PARA', name: 'Paramount Global', market: 'US' as Market },
    { symbol: 'QLD', name: 'ProShares Ultra QQQ', market: 'US' as Market },
    { symbol: 'DJT', name: 'DJT Corporation', market: 'US' as Market },
    { symbol: 'TMF', name: 'Direxion Daily 20+ Year Treasury Bull 3x Shares', market: 'US' as Market },
    { symbol: 'EWZ', name: 'iShares MSCI Brazil ETF', market: 'US' as Market },
    
    // German Stocks (XETRA)
    { symbol: 'MBG.XETRA', name: 'Mercedes-Benz Group AG', market: 'XETRA' as Market },
    { symbol: 'DHER.XETRA', name: 'Deutsche Börse AG', market: 'XETRA' as Market },
    { symbol: 'SMSN.IL', name: 'Siemens AG', market: 'XETRA' as Market },
    { symbol: 'POAHY.US', name: 'Porsche Automobil Holding SE', market: 'XETRA' as Market },
    { symbol: 'BMW.XETRA', name: 'BMW AG', market: 'XETRA' as Market },
    { symbol: 'SAP.XETRA', name: 'SAP SE', market: 'XETRA' as Market },
    
    // UK Stocks (London Stock Exchange)
    { symbol: 'BT-A.LON', name: 'BT Group plc', market: 'LSE' as Market },
    { symbol: 'HSBA.LSE', name: 'HSBC Holdings plc', market: 'LSE' as Market },
    { symbol: 'BP.LSE', name: 'BP p.l.c.', market: 'LSE' as Market },
    { symbol: 'VOD.LSE', name: 'Vodafone Group Plc', market: 'LSE' as Market },
    
    // Canadian Stocks (Toronto Stock Exchange)
    { symbol: 'SHOP.TRT', name: 'Shopify Inc.', market: 'TSX' as Market },
    { symbol: 'RY.TRT', name: 'Royal Bank of Canada', market: 'TSX' as Market },
    { symbol: 'TD.TRT', name: 'Toronto-Dominion Bank', market: 'TSX' as Market },
    { symbol: 'CNR.TRT', name: 'Canadian National Railway Company', market: 'TSX' as Market },
    
    // Canadian Stocks (Toronto Venture Exchange)
    { symbol: 'GPV.TRV', name: 'GreenPower Motor Company Inc.', market: 'TSXV' as Market },
    
    // Indian Stocks (BSE)
    { symbol: 'RELIANCE.NSE', name: 'Reliance Industries Limited', market: 'BSE' as Market },
    { symbol: 'TCS.NSE', name: 'Tata Consultancy Services Limited', market: 'BSE' as Market },
    { symbol: 'HDFCBANK.NSE', name: 'HDFC Bank Limited', market: 'BSE' as Market },
    { symbol: 'INFY.NSE', name: 'Infosys Limited', market: 'BSE' as Market },
    
    // Chinese Stocks (Shanghai Stock Exchange)
    { symbol: '600104.SHG', name: 'SAIC Motor Corporation Limited', market: 'SSE' as Market },
    { symbol: '601318.SHG', name: 'Ping An Insurance (Group) Company of China, Ltd.', market: 'SSE' as Market },
    { symbol: '600519.SHG', name: 'Kweichow Moutai Co., Ltd.', market: 'SSE' as Market },
    
    // Chinese Stocks (Shenzhen Stock Exchange)
    { symbol: '000002.SHE', name: 'China Vanke Co., Ltd.', market: 'SZSE' as Market },
    { symbol: '000651.SHE', name: 'Gree Electric Appliances Inc. of Zhuhai', market: 'SZSE' as Market },
    { symbol: '000333.SHE', name: 'Midea Group Co., Ltd.', market: 'SZSE' as Market },
  
    { symbol: 'FEMSAUB.MX', name: 'Grupo Femsa', market: 'MX' as Market }
  ];


export default stockTickers;