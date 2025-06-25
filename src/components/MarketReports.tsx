import React, { useState, useEffect } from 'react';
import { Search, Download, Bot } from 'lucide-react';
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
  onAnalyzeWithAI?: (pdfData: { base64: string; filename: string }) => void;
  onAnalyzeMultipleWithAI?: (pdfDataArray: Array<{ base64: string; filename: string }>) => void;
}

const MarketReports: React.FC<MarketReportsProps> = ({ 
  searchQuery, 
  onSearchChange, 
  onAnalyzeWithAI,
  onAnalyzeMultipleWithAI 
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'quarter' | 'research'>('quarter');
  const [isAnalyzingMultiple, setIsAnalyzingMultiple] = useState(false);
  const [quarterReports, setQuarterReports] = useState<Report[]>([]);
  const [researchReports, setResearchReports] = useState<Report[]>([]);
  const [selectedQuarterReports, setSelectedQuarterReports] = useState<Set<string>>(new Set());
  const [selectedResearchReports, setSelectedResearchReports] = useState<Set<string>>(new Set());

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
        if (selectedType === 'quarter') {
          setQuarterReports([]);
        } else {
          setResearchReports([]);
        }
        setAllReports([]);
        setReports([]);
      } else {
        console.log('Setting reports:', results);
        if (selectedType === 'quarter') {
          setQuarterReports(results);
        } else {
          setResearchReports(results);
        }
        setAllReports(results);
        setReports(results);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Error loading reports. Please try again.');
      if (selectedType === 'quarter') {
        setQuarterReports([]);
      } else {
        setResearchReports([]);
      }
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

  // Load both types of reports on component mount
  useEffect(() => {
    const loadAllReports = async () => {
      try {
        // Load quarter reports
        const quarterResults = await searchReports('quarter');
        setQuarterReports(quarterResults || []);
        
        // Load research reports
        const researchResults = await searchReports('research');
        setResearchReports(researchResults || []);
        
        // Set initial reports based on selected type
        if (selectedType === 'quarter') {
          setAllReports(quarterResults || []);
          setReports(quarterResults || []);
        } else {
          setAllReports(researchResults || []);
          setReports(researchResults || []);
        }
      } catch (err) {
        console.error('Error loading all reports:', err);
        setError('Error loading reports. Please try again.');
      }
    };

    loadAllReports();
  }, []); // Only run on mount

  useEffect(() => {
    console.log('Filtering reports. Search query:', searchQuery, 'Selected letter:', selectedLetter);
    let filteredResults = [...allReports];

    // Aplicar filtro alfabético si hay una letra seleccionada (solo en desktop)
    if (selectedLetter && window.innerWidth >= 1024) {
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

  const handleReportSelection = (reportId: string, reportType: 'quarter' | 'research') => {
    if (reportType === 'quarter') {
      setSelectedQuarterReports(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(reportId)) {
          newSelection.delete(reportId);
        } else if (newSelection.size + selectedResearchReports.size < 5) {
          newSelection.add(reportId);
        }
        return newSelection;
      });
    } else {
      setSelectedResearchReports(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(reportId)) {
          newSelection.delete(reportId);
        } else if (newSelection.size + selectedQuarterReports.size < 5) {
          newSelection.add(reportId);
        }
        return newSelection;
      });
    }
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
    // Don't clear selections when switching types
  };

  const handleAnalyzeWithAI = async (report: Report) => {
    if (!onAnalyzeWithAI) return;
    
    try {
      // Download the PDF file
      const response = await fetch(report.file_url);
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      // Convert to ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert to base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);
      
      // Get filename from URL
      const filename = getFileName(report.file_url);
      
      // Send to AI Assistant
      onAnalyzeWithAI({
        base64: base64Data,
        filename: filename
      });
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      // You could add a toast notification here
    }
  };

  const handleAnalyzeMultiple = async () => {
    if (!onAnalyzeMultipleWithAI || (selectedQuarterReports.size === 0 && selectedResearchReports.size === 0)) {
      return;
    }
    
    setIsAnalyzingMultiple(true);
    
    try {
      // Combine selected reports from both types
      const selectedQuarterReportObjects = quarterReports.filter(report => selectedQuarterReports.has(report.id));
      const selectedResearchReportObjects = researchReports.filter(report => selectedResearchReports.has(report.id));
      const allSelectedReports = [...selectedQuarterReportObjects, ...selectedResearchReportObjects];
      
      const pdfDataArray: Array<{ base64: string; filename: string }> = [];
      
      for (const report of allSelectedReports) {
        try {
          // Download the PDF file
          const response = await fetch(report.file_url);
          if (!response.ok) {
            console.error(`Failed to download PDF: ${report.title}`);
            continue;
          }
          
          // Convert to ArrayBuffer
          const arrayBuffer = await response.arrayBuffer();
          
          // Convert to base64
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);
          
          // Get filename from URL
          const filename = getFileName(report.file_url);
          
          pdfDataArray.push({
            base64: base64Data,
            filename: filename
          });
        } catch (error) {
          console.error(`Error downloading PDF for ${report.title}:`, error);
        }
      }
      
      if (pdfDataArray.length > 0) {
        onAnalyzeMultipleWithAI(pdfDataArray);
        // Clear all selections after analysis
        setSelectedQuarterReports(new Set());
        setSelectedResearchReports(new Set());
      }
      
    } catch (error) {
      console.error('Error analyzing multiple PDFs:', error);
    } finally {
      setIsAnalyzingMultiple(false);
    }
  };

  // Calculate total selected reports
  const totalSelectedReports = selectedQuarterReports.size + selectedResearchReports.size;
  const isReportSelected = (reportId: string) => {
    return selectedQuarterReports.has(reportId) || selectedResearchReports.has(reportId);
  };

  return (
    <div className="flex flex-col lg:flex-row flex-1 gap-2 sm:gap-4 p-2 sm:p-4 overflow-hidden">
      <div className="flex-1 flex flex-col gap-2 sm:gap-4 overflow-hidden">
        <div className="glass-panel p-3 sm:p-6 flex flex-col h-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#b9d6ee]">Market Reports</h2>
              <p className="text-xs sm:text-sm text-[#b9d6ee]/70 mt-1">
                {reports.length} reports available
                {totalSelectedReports > 0 && (
                  <span className="ml-2 text-[#b9d6ee]">
                    • {totalSelectedReports} selected
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleTypeChange('quarter')}
                className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                  selectedType === 'quarter'
                    ? 'bg-[#b9d6ee] text-black'
                    : 'bg-[#b9d6ee]/10 text-[#b9d6ee] hover:bg-[#b9d6ee]/20'
                }`}
              >
                Quarter Reports
                {selectedQuarterReports.size > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-[#b9d6ee]/20 rounded-full">
                    {selectedQuarterReports.size}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleTypeChange('research')}
                className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                  selectedType === 'research'
                    ? 'bg-[#b9d6ee] text-black'
                    : 'bg-[#b9d6ee]/10 text-[#b9d6ee] hover:bg-[#b9d6ee]/20'
                }`}
              >
                Research
                {selectedResearchReports.size > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-[#b9d6ee]/20 rounded-full">
                    {selectedResearchReports.size}
                  </span>
                )}
              </button>
            </div>
          </div>

          {totalSelectedReports > 0 && (
            <div className="mb-4 p-3 sm:p-4 bg-gradient-to-r from-[#b9d6ee]/10 to-[#b9d6ee]/5 border border-[#b9d6ee]/20 rounded-lg backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-[#b9d6ee]/20 rounded-full">
                    <span className="text-[#b9d6ee] font-semibold text-sm">
                      {totalSelectedReports}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#b9d6ee] font-medium text-sm">
                      {totalSelectedReports} document{totalSelectedReports !== 1 ? 's' : ''} selected
                    </span>
                    <p className="text-xs text-[#b9d6ee]/60 mt-0.5">
                      {selectedQuarterReports.size > 0 && selectedResearchReports.size > 0 
                        ? `${selectedQuarterReports.size} Quarter + ${selectedResearchReports.size} Research`
                        : selectedQuarterReports.size > 0 
                        ? `${selectedQuarterReports.size} Quarter Reports`
                        : `${selectedResearchReports.size} Research Reports`
                      } • Ready for AI analysis
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setSelectedQuarterReports(new Set());
                      setSelectedResearchReports(new Set());
                    }}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear All
                  </button>
                  <button
                    onClick={handleAnalyzeMultiple}
                    disabled={isAnalyzingMultiple}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-gradient-to-r from-[#b9d6ee]/20 to-[#b9d6ee]/10 text-[#b9d6ee] rounded-lg hover:from-[#b9d6ee]/30 hover:to-[#b9d6ee]/20 transition-all duration-200 border border-[#b9d6ee]/30 hover:border-[#b9d6ee]/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {isAnalyzingMultiple ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#b9d6ee] border-t-transparent"></div>
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" />
                        <span>Analyze {totalSelectedReports} with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Alphabet filter - only show on desktop */}
          <div className="hidden lg:block mb-4">
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

          <div className="relative mb-4 sm:mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-[#b9d6ee]/50" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by ticker, company name, document name, or report type..."
              className="w-full pl-10 pr-4 py-2 sm:py-3 bg-black/30 border border-[#b9d6ee]/20 rounded-lg text-[#b9d6ee] placeholder-[#b9d6ee]/50 focus:outline-none focus:ring-2 focus:ring-[#b9d6ee]/50 text-sm sm:text-base"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b9d6ee]"></div>
              </div>
            ) : error ? (
              <div className="text-red-400 text-center p-4 text-sm">{error}</div>
            ) : reports.length === 0 ? (
              <div className="text-center text-[#b9d6ee]/70 p-8 text-sm">
                No reports found matching your search
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`glass-panel p-3 sm:p-4 rounded-lg hover:bg-white/5 transition-colors text-left relative ${
                      selectedReport?.id === report.id ? 'ring-2 ring-[#b9d6ee]' : ''
                    } ${isReportSelected(report.id) ? 'ring-2 ring-[#b9d6ee] bg-[#b9d6ee]/10' : ''}`}
                  >
                    {/* Selection checkbox */}
                    <div className="absolute top-2 right-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isReportSelected(report.id)}
                          onChange={() => handleReportSelection(report.id, selectedType)}
                          className="w-4 h-4 text-[#b9d6ee] bg-transparent border-[#b9d6ee] rounded focus:ring-[#b9d6ee] focus:ring-2"
                          title={`Select ${report.title} for AI analysis`}
                          aria-label={`Select ${report.title} for AI analysis`}
                        />
                      </label>
                    </div>

                    <button
                      onClick={() => handleReportClick(report)}
                      className="w-full text-left"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="pr-6">
                          <h3 className="text-base sm:text-lg font-semibold text-[#b9d6ee]">{report.title}</h3>
                          <p className="text-xs sm:text-sm text-[#b9d6ee]/70">{report.stock_symbol}</p>
                          <p className="text-xs text-[#b9d6ee]/50 mt-1">
                            {getFileName(report.file_url)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-[#b9d6ee]/70 mb-3 line-clamp-2">
                        {report.description}
                      </p>
                    </button>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#b9d6ee]/50">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1 sm:gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnalyzeWithAI(report);
                          }}
                          className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded transition-colors text-xs"
                          title="Analizar con IA"
                        >
                          <Bot className="w-3 h-3 text-[#b9d6ee]" />
                          <span className="hidden sm:inline text-[#b9d6ee]">Analizar con IA</span>
                          <span className="sm:hidden text-[#b9d6ee]">IA</span>
                        </button>
                        <a
                          href={report.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="Descargar"
                        >
                          <Download className="w-4 h-4 text-[#b9d6ee]" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedReport && (
        <div className="w-full lg:w-1/2 glass-panel p-3 sm:p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-[#b9d6ee]">{selectedReport.stock_symbol}</h3>
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