import React, { useState, useEffect } from 'react';
import { Send, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prompt } from '../lib/Lookup';

/* ------------------------------------------------------------------
 *  Helpers
 * ------------------------------------------------------------------ */
// const generateSessionId = () =>
//   'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
//     const r = (Math.random() * 16) | 0;
//     const v = c === 'x' ? r : (r & 0x3) | 0x8;
//     return v.toString(16);
//   });

// Helper function to convert ArrayBuffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  pdfData?: {
    base64: string;
    filename: string;
  };
}

interface AIAssistantProps {
  onCompanySelected: (company: string, ticker: string) => void;
  stocks: Array<{ symbol: string; name: string }>;
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ onCompanySelected, stocks }) => {
  /* --------------------------------------------------------------
   *  State
   * -------------------------------------------------------------- */
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      role: 'system',
      content: prompt
    },
    {
      role: 'assistant',
      content: '¡Hola! Soy Kevin tu Robo Advisor de IA. Puedes enviarme un PDF para analizarlo o hacerme preguntas directamente sobre el mercado financiero.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  // const [sessionId] = useState(() => generateSessionId());
  const [processedPatterns] = useState(new Set<string>());
  const [currentPdf, setCurrentPdf] = useState<{ base64: string; filename: string } | null>(null);

  // Initialize Gemini
  const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  /* --------------------------------------------------------------
   *  Detectar patrón !TICKER, Company!
   * -------------------------------------------------------------- */
  const processMessage = (content: string) => {
    const regex = /!([A-Z]+),\s*([^!]+)!/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const [full, ticker, company] = match;
      if (!processedPatterns.has(full)) {
        onCompanySelected(company.trim(), ticker);
        processedPatterns.add(full);
      }
    }
  };

  /* --------------------------------------------------------------
   *  SUBIDA de PDF y placeholder
   * -------------------------------------------------------------- */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);

      // Store PDF data
      setCurrentPdf({
        base64: base64Data,
        filename: file.name
      });

    } catch (error) {
      console.error(error);
      setChatMessages(m => [...m, {
        role: 'assistant',
        content: 'Lo siento, hubo un error al cargar el documento.'
      }]);
    }
  };

  /** --------------------------------------------------------------
   *  Enviar mensaje normal o con PDF
   *  -------------------------------------------------------------- */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: message,
      ...(currentPdf && { pdfData: currentPdf })
    };
    setChatMessages(prev => [...prev, userMessage]);
    setMessage('');
    setCurrentPdf(null); // Clear PDF from input area
    setIsLoading(true);

    // Add streaming message
    const streamingMessage: Message = { 
      role: 'assistant', 
      content: '',
      isStreaming: true 
    };
    setChatMessages(prev => [...prev, streamingMessage]);

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const content = [
        prompt, // System prompt
        message, // User message
        ...(userMessage.pdfData ? [{
          inlineData: {
            mimeType: 'application/pdf',
            data: userMessage.pdfData.base64
          }
        }] : [])
      ];

      const result = await model.generateContentStream(content);
      let fullResponse = '';
      let lastUpdate = Date.now();
      const updateInterval = 50; // Update UI every 50ms

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
        // Throttle UI updates for better performance
        const now = Date.now();
        if (now - lastUpdate >= updateInterval) {
          setChatMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.isStreaming) {
              lastMessage.content = fullResponse;
            }
            return newMessages;
          });
          lastUpdate = now;
        }
      }

      // Final update with complete response
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: fullResponse
        };
        return newMessages;
      });
      processMessage(fullResponse);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Lo siento, ocurrió un error.'
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  /** --------------------------------------------------------------
   *  Efecto: mapear patrones !Company!
   *  -------------------------------------------------------------- */
  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (last?.role !== 'assistant') return;
    const m = last.content.match(/!([\w\s,.]+)!/);
    if (!m) return;
    const companyName = m[1];
    const exact = stocks.find(s => s.name === companyName);
    const fallback = exact ?? stocks.find(s => companyName.toLowerCase().includes(s.name.toLowerCase()));
    if (fallback) onCompanySelected(companyName, fallback.symbol);
  }, [chatMessages, stocks, onCompanySelected]);

  /** --------------------------------------------------------------
   *  Render
   *  -------------------------------------------------------------- */
  return (
    <div className="w-1/3 glass-panel flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#b9d6ee]/10">
        <h2 className="text-xl font-bold text-[#b9d6ee]">AI Assistant</h2>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {chatMessages
          .filter(m => m.role !== 'system')
          .map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  m.role === 'user'
                    ? 'bg-[#b9d6ee] bg-opacity-20 text-white'
                    : 'bg-white bg-opacity-10 text-gray-200'
                }`}
              >
                {m.pdfData && (
                  <div className="flex items-center gap-2 mb-2 text-[#b9d6ee]">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{m.pdfData.filename}</span>
                  </div>
                )}
                <div className="markdown-content prose prose-invert max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Headings
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 text-[#b9d6ee]" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 text-[#b9d6ee]" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-2 text-[#b9d6ee]" {...props} />,
                      
                      // Lists
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      
                      // Code blocks
                      code: ({inline, className, children, ...props}: CodeProps) => 
                        inline ? 
                          <code className="bg-[#b9d6ee]/10 px-1.5 py-0.5 rounded text-[#b9d6ee]" {...props}>{children}</code> :
                          <code className="block bg-[#b9d6ee]/10 p-3 rounded-lg mb-4 overflow-x-auto" {...props}>{children}</code>,
                      
                      // Blockquotes
                      blockquote: ({node, ...props}) => 
                        <blockquote className="border-l-4 border-[#b9d6ee] pl-4 italic my-4" {...props} />,
                      
                      // Tables
                      table: ({node, ...props}) => 
                        <div className="overflow-x-auto mb-4">
                          <table className="min-w-full border-collapse" {...props} />
                        </div>,
                      th: ({node, ...props}) => 
                        <th className="border border-[#b9d6ee]/20 px-4 py-2 bg-[#b9d6ee]/10" {...props} />,
                      td: ({node, ...props}) => 
                        <td className="border border-[#b9d6ee]/20 px-4 py-2" {...props} />,
                      
                      // Links
                      a: ({node, ...props}) => 
                        <a className="text-[#b9d6ee] hover:underline" {...props} />,
                      
                      // Paragraphs
                      p: ({node, ...props}) => 
                        <p className="mb-4 leading-relaxed" {...props} />,
                      
                      // Horizontal rule
                      hr: ({node, ...props}) => 
                        <hr className="my-6 border-[#b9d6ee]/20" {...props} />,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        {isLoading && !chatMessages[chatMessages.length - 1]?.isStreaming && (
          <div className="flex justify-start">
            <div className="glass-panel p-3 flex gap-2">
              <div className="w-2 h-2 bg-[#b9d6ee] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-[#b9d6ee] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-[#b9d6ee] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-[#b9d6ee]/10">
        {currentPdf && (
          <div className="flex items-center gap-2 mb-2 text-[#b9d6ee]">
            <Upload className="w-4 h-4" />
            <span className="text-sm">{currentPdf.filename}</span>
          </div>
        )}
        <div className="flex gap-2 items-center">
          {/* File */}
          <label htmlFor="pdf-upload" className="cursor-pointer p-2 bg-[#b9d6ee]/20 rounded-lg hover:bg-opacity-30">
            <Upload className="w-5 h-5 text-[#b9d6ee]" />
          </label>
          <input 
            id="pdf-upload" 
            type="file" 
            accept=".pdf" 
            className="hidden" 
            onChange={handleFileUpload}
            aria-label="Upload PDF document"
          />

          {/* Text */}
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="flex-1 glass-panel px-4 py-2 text-[#b9d6ee] placeholder-[#b9d6ee]/50 focus:outline-none"
            placeholder="Escribe tu pregunta…"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="p-2 bg-[#b9d6ee]/20 rounded-lg hover:bg-opacity-30 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="w-5 h-5 text-[#b9d6ee]" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistant;
