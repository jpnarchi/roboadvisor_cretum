export type Market = 'US' | 'XETRA' | 'LSE' | 'TSX' | 'TSXV' | 'BSE' | 'SSE' | 'SZSE' | 'MX';

export interface StockData {
  symbol: string;
  name: string;
  market: Market;
  price?: number;
  change?: number;
  loading?: boolean;
  error?: string;
} 