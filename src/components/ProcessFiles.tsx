import React, { useState } from 'react';
import { processAllFiles } from '../services/supabaseService';

const ProcessFiles: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleProcessFiles = async () => {
    setIsProcessing(true);
    setMessage(null);
    try {
      const result = await processAllFiles();
      setMessage(result.message);
    } catch (error) {
      setMessage('Error processing files. Check console for details.');
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleProcessFiles}
        disabled={isProcessing}
        className="px-4 py-2 bg-[#b9d6ee] text-black rounded-lg hover:bg-[#b9d6ee]/80 disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Process All Files'}
      </button>
      {message && (
        <p className="mt-4 text-[#b9d6ee]">{message}</p>
      )}
    </div>
  );
};

export default ProcessFiles; 