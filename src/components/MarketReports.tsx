import React, { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { searchReports } from '../services/supabaseService';

interface Report {
  id: string;
  title: string;
  description: string;
  stock_symbol: string;
  report_type: string;
  file_url: string;
  created_at: string;
}

interface MarketReportsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const MarketReports: React.FC<MarketReportsProps> = ({ searchQuery, onSearchChange }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'quarter' | 'research'>('quarter');

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    console.log('Fetching reports of type:', selectedType);

    try {
      const results = await searchReports(selectedType);
      console.log('Fetched reports:', results);
      
      if (!results || results.length === 0) {
        console.log('No reports found for type:', selectedType);
        setAllReports([]);
        setReports([]);
      } else {
        console.log('Setting reports:', results);
        setAllReports(results);
        setReports(results);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Error loading reports. Please try again.');
      setAllReports([]);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Selected type changed to:', selectedType);
    fetchReports();
  }, [selectedType]);

  useEffect(() => {
    console.log('Filtering reports. Search query:', searchQuery, 'Selected letter:', selectedLetter);
    let filteredResults = [...allReports];

    // Aplicar filtro alfabético si hay una letra seleccionada
    if (selectedLetter) {
      filteredResults = filteredResults.filter(report => {
        const title = report.title.toUpperCase();
        const symbol = report.stock_symbol.toUpperCase();
        const fileName = getFileName(report.file_url).toUpperCase();
        return title.startsWith(selectedLetter) || 
               symbol.startsWith(selectedLetter) || 
               fileName.startsWith(selectedLetter);
      });
    }

    // Aplicar búsqueda por texto si hay un término de búsqueda
    if (searchQuery.trim()) {
      const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
      filteredResults = filteredResults.filter(report => {
        const fileName = decodeURIComponent(report.file_url.split('/').pop() || '');
        
        const searchFields = {
          symbol: report.stock_symbol.toLowerCase(),
          title: report.title.toLowerCase(),
          description: report.description.toLowerCase(),
          fileName: fileName.toLowerCase(),
          reportType: report.report_type.toLowerCase()
        };

        return searchTerms.some(term => 
          searchFields.symbol.includes(term) ||
          searchFields.title.includes(term) ||
          searchFields.description.includes(term) ||
          searchFields.fileName.includes(term) ||
          searchFields.reportType.includes(term)
        );
      });
    }

    console.log('Filtered results:', filteredResults);
    setReports(filteredResults);
  }, [searchQuery, allReports, selectedLetter]);

  const handleReportClick = (report: Report) => {
    console.log('Report clicked:', report);
    setSelectedReport(report);
  };

  const getFileName = (url: string) => {
    const fileName = url.split('/').pop() || '';
    return decodeURIComponent(fileName);
  };

  const handleLetterClick = (letter: string) => {
    setSelectedLetter(selectedLetter === letter ? null : letter);
  };

  const handleTypeChange = (type: 'quarter' | 'research') => {
    console.log('Changing type to:', type);
    setSelectedType(type);
    setSelectedLetter(null); // Reset letter filter when changing type
    setSelectedReport(null); // Reset selected report when changing type
  };

  return (
    <div className="flex flex-1 gap-4 p-4 overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="glass-panel p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#b9d6ee]">Market Reports</h2>
              <p className="text-sm text-[#b9d6ee]/70 mt-1">
                {reports.length} reports available
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleTypeChange('quarter')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedType === 'quarter'
                    ? 'bg-[#b9d6ee] text-black'
                    : 'bg-[#b9d6ee]/10 text-[#b9d6ee] hover:bg-[#b9d6ee]/20'
                }`}
              >
                Quarter Reports
              </button>
              <button
                onClick={() => handleTypeChange('research')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedType === 'research'
                    ? 'bg-[#b9d6ee] text-black'
                    : 'bg-[#b9d6ee]/10 text-[#b9d6ee] hover:bg-[#b9d6ee]/20'
                }`}
              >
                Research
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {alphabet.map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleLetterClick(letter)}
                  className={`px-2 py-1 rounded ${
                    selectedLetter === letter
                      ? 'bg-[#b9d6ee] text-black'
                      : 'bg-[#b9d6ee]/10 text-[#b9d6ee] hover:bg-[#b9d6ee]/20'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-[#b9d6ee]/50" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by ticker, company name, document name, or report type..."
              className="w-full pl-10 pr-4 py-3 bg-black/30 border border-[#b9d6ee]/20 rounded-lg text-[#b9d6ee] placeholder-[#b9d6ee]/50 focus:outline-none focus:ring-2 focus:ring-[#b9d6ee]/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b9d6ee]"></div>
              </div>
            ) : error ? (
              <div className="text-red-400 text-center p-4">{error}</div>
            ) : reports.length === 0 ? (
              <div className="text-center text-[#b9d6ee]/70 p-8">
                No reports found matching your search
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => handleReportClick(report)}
                    className={`glass-panel p-4 rounded-lg hover:bg-white/5 transition-colors text-left ${
                      selectedReport?.id === report.id ? 'ring-2 ring-[#b9d6ee]' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-[#b9d6ee]">{report.title}</h3>
                        <p className="text-sm text-[#b9d6ee]/70">{report.stock_symbol}</p>
                        <p className="text-xs text-[#b9d6ee]/50 mt-1">
                          {getFileName(report.file_url)}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-[#b9d6ee]/10 text-[#b9d6ee]">
                        {report.report_type}
                      </span>
                    </div>
                    <p className="text-sm text-[#b9d6ee]/70 mb-3 line-clamp-2">
                      {report.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#b9d6ee]/50">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                      <a
                        href={report.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <Download className="w-4 h-4 text-[#b9d6ee]" />
                      </a>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedReport && (
        <div className="w-1/2 glass-panel p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-[#b9d6ee]">{selectedReport.stock_symbol}</h3>
            <p className="text-sm text-[#b9d6ee]/70">{selectedReport.title}</p>
            <p className="text-xs text-[#b9d6ee]/50 mt-1">
              {getFileName(selectedReport.file_url)}
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe
              src={`${selectedReport.file_url}#toolbar=0`}
              className="w-full h-full rounded-lg"
              title={getFileName(selectedReport.file_url)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketReports; 