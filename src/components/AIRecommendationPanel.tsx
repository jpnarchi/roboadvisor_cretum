import React, {memo, useMemo} from 'react';
import { AIRecommendation } from '../types/AIRecommendation';
import ReactMarkdown from 'react-markdown';

interface CompanyOverview {
  Symbol: string;
  Name: string;
  Description: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  "52WeekHigh": string;
  "52WeekLow": string;
  "50DayMovingAverage": string;
  "200DayMovingAverage": string;
  SharesOutstanding: string;
  DividendDate: string;
  ExDividendDate: string;
  AnalystRatingBuy: string;
  AnalystRatingHold: string;
  AnalystRatingSell: string;
}

interface AIRecommendationPanelProps {
  companyOverview?: CompanyOverview;
  recommendation?: AIRecommendation | null;
  explanation?: string;
}

const AIRecommendationPanel: React.FC<AIRecommendationPanelProps> = ({ 
  companyOverview,
  recommendation,
  explanation 
}) => {
  console.log('AIRecommendationPanel received props:', { recommendation, explanation });

  const getRecommendationColor = (rec: AIRecommendation | null | undefined) => {
    if (!rec) return 'text-gray-500';
    switch (rec) {
      case 'STRONG_BUY':
      case 'BUY':
        return 'text-green-400';
      case 'NEUTRAL':
        return 'text-yellow-400';
      case 'SELL':
      case 'STRONG_SELL':
        return 'text-red-400';
      default:
        return 'text-gray-500';
    }
  };

  const getRecommendationBackground = (rec: AIRecommendation | null | undefined) => {
    if (!rec) return 'from-gray-500/5 border-gray-500/30';
    switch (rec) {
      case 'STRONG_BUY':
      case 'BUY':
        return 'from-green-400/5 border-green-400/30';
      case 'NEUTRAL':
        return 'from-yellow-400/5 border-yellow-400/30';
      case 'SELL':
      case 'STRONG_SELL':
        return 'from-red-400/5 border-red-400/30';
      default:
        return 'from-gray-500/5 border-gray-500/30';
    }
  };

  const formatMetric = (value: string | undefined) => {
    if (!value || value === 'N/A') return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const getMetricColor = (value: string | undefined, type: 'positive' | 'negative') => {
    if (!value || value === 'N/A') return 'text-gray-500';
    const num = parseFloat(value);
    if (isNaN(num)) return 'text-gray-500';
    
    if (type === 'positive') {
      if (num > 0) return 'text-green-400';
      if (num < 0) return 'text-red-400';
    } else {
      if (num > 0) return 'text-red-400';
      if (num < 0) return 'text-green-400';
    }
    return 'text-gray-500';
  };

  // Memoize the recommendation colors and backgrounds
  const recommendationColor = useMemo(() => getRecommendationColor(recommendation), [recommendation]);
  const recommendationBackground = useMemo(() => getRecommendationBackground(recommendation), [recommendation]);

  // Memoize the formatted metrics
  const formattedMetrics = useMemo(() => {
    if (!companyOverview) return null;
    return {
      peRatio: formatMetric(companyOverview.PERatio),
      pegRatio: formatMetric(companyOverview.PEGRatio),
      dividendYield: formatMetric(companyOverview.DividendYield),
      roe: formatMetric(companyOverview.ReturnOnEquityTTM),
      profitMargin: formatMetric(companyOverview.ProfitMargin),
      beta: formatMetric(companyOverview.Beta)
    };
  }, [companyOverview]);

  // Memoize the metric colors
  const metricColors = useMemo(() => {
    if (!companyOverview) return null;
    return {
      peRatio: getMetricColor(companyOverview.PERatio, 'negative'),
      pegRatio: getMetricColor(companyOverview.PEGRatio, 'negative'),
      dividendYield: getMetricColor(companyOverview.DividendYield, 'positive'),
      roe: getMetricColor(companyOverview.ReturnOnEquityTTM, 'positive'),
      profitMargin: getMetricColor(companyOverview.ProfitMargin, 'positive'),
      beta: getMetricColor(companyOverview.Beta, 'negative')
    };
  }, [companyOverview]);

  return (
    <div className="glass-panel p-6 rounded-xl border border-[#b9d6ee]/10 bg-gradient-to-br from-[#b9d6ee]/5 to-transparent backdrop-blur-lg shadow-glow">
      <h3 className="text-lg font-semibold mb-6 text-[#b9d6ee] flex items-center">
        <span className="mr-2">AI Analysis</span>
        <div className="h-px flex-1 bg-gradient-to-r from-[#b9d6ee]/20 to-transparent"></div>
      </h3>
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${recommendationBackground}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#b9d6ee]/70 font-medium">Recommendation</span>
            <span className={`text-xl font-bold ${recommendationColor}`}>
              {recommendation || 'N/A'}
            </span>
          </div>
        </div>

        <div className="text-[#b9d6ee]/80">
          <p className="font-medium mb-2">Analysis:</p>
          <div className="prose prose-invert max-w-none whitespace-pre-line">
            <ReactMarkdown>
              {explanation || 'No analysis available.'}
            </ReactMarkdown>
          </div>
        </div>

        {companyOverview && formattedMetrics && metricColors && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <div>
                <span className="text-sm text-[#b9d6ee]/70">P/E Ratio</span>
                <p className={`text-lg font-semibold ${metricColors.peRatio}`}>
                  {formattedMetrics.peRatio}
                </p>
              </div>
              <div>
                <span className="text-sm text-[#b9d6ee]/70">PEG Ratio</span>
                <p className={`text-lg font-semibold ${metricColors.pegRatio}`}>
                  {formattedMetrics.pegRatio}
                </p>
              </div>
              <div>
                <span className="text-sm text-[#b9d6ee]/70">Dividend Yield</span>
                <p className={`text-lg font-semibold ${metricColors.dividendYield}`}>
                  {formattedMetrics.dividendYield}%
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-[#b9d6ee]/70">Return on Equity</span>
                <p className={`text-lg font-semibold ${metricColors.roe}`}>
                  {formattedMetrics.roe}%
                </p>
              </div>
              <div>
                <span className="text-sm text-[#b9d6ee]/70">Profit Margin</span>
                <p className={`text-lg font-semibold ${metricColors.profitMargin}`}>
                  {formattedMetrics.profitMargin}%
                </p>
              </div>
              <div>
                <span className="text-sm text-[#b9d6ee]/70">Beta</span>
                <p className={`text-lg font-semibold ${metricColors.beta}`}>
                  {formattedMetrics.beta}
                </p>
              </div>
            </div>
          </div>
        )}

        {companyOverview?.Description && (
          <div className="text-[#b9d6ee]/80 mt-4">
            <p className="font-medium mb-2">Company Overview:</p>
            <p>{companyOverview.Description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AIRecommendationPanel, (prevProps, nextProps) => {
  return (
    prevProps.recommendation === nextProps.recommendation &&
    prevProps.explanation === nextProps.explanation &&
    JSON.stringify(prevProps.companyOverview) === JSON.stringify(nextProps.companyOverview)
  );
});