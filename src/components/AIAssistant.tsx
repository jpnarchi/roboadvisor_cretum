import React, { useState, useEffect } from 'react';
import { Send, Upload, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prompt } from '../lib/Lookup';

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
  externalPdf?: {
    base64: string;
    filename: string;
  } | null;
  onExternalPdfProcessed?: () => void;
  externalMultiplePdfs?: Array<{ base64: string; filename: string }> | null;
  onExternalMultiplePdfsProcessed?: () => void;
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  onCompanySelected, 
  stocks, 
  externalPdf, 
  onExternalPdfProcessed, 
  externalMultiplePdfs, 
  onExternalMultiplePdfsProcessed 
}) => {
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
  const [processedPatterns] = useState(new Set<string>());
  const [currentPdf, setCurrentPdf] = useState<{ base64: string; filename: string } | null>(null);
  
  // NUEVO: Estado para mantener los PDFs en memoria
  const [activePdfs, setActivePdfs] = useState<Array<{ base64: string; filename: string }>>([]);
  
  const processedExternalPdfRef = React.useRef<string | null>(null);

  // Initialize Gemini
  const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);

      const pdfData = {
        base64: base64Data,
        filename: file.name
      };

      setCurrentPdf(pdfData);
      
      // NUEVO: Agregar PDF a la memoria activa si no existe ya
      setActivePdfs(prev => {
        const exists = prev.some(pdf => pdf.filename === pdfData.filename);
        if (!exists) {
          return [...prev, pdfData];
        }
        return prev;
      });

    } catch (error) {
      console.error(error);
      setChatMessages(m => [...m, {
        role: 'assistant',
        content: 'Lo siento, hubo un error al cargar el documento.'
      }]);
    }
  };

  // NUEVO: Función para remover PDF de la memoria
  const removePdfFromMemory = (filename: string) => {
    setActivePdfs(prev => prev.filter(pdf => pdf.filename !== filename));
  };

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
    setCurrentPdf(null);
    setIsLoading(true);

    const streamingMessage: Message = { 
      role: 'assistant', 
      content: '',
      isStreaming: true 
    };
    setChatMessages(prev => [...prev, streamingMessage]);

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // MODIFICADO: Construir el contenido correctamente para Gemini
      const content = [];
      
      // Si hay PDFs activos, incluir un mensaje del sistema con los PDFs
      if (activePdfs.length > 0) {
        content.push({
          role: 'user',
          parts: [
            { text: `Contexto: Tengo acceso a los siguientes documentos PDF: ${activePdfs.map(pdf => pdf.filename).join(', ')}. Úsalos como referencia para responder mis preguntas.` },
            ...activePdfs.map(pdf => ({
              inlineData: {
                mimeType: 'application/pdf',
                data: pdf.base64
              }
            } as any))
          ]
        });
        content.push({
          role: 'model',
          parts: [{ text: 'Entendido. He procesado los documentos PDF. Puedes hacerme preguntas sobre su contenido.' }]
        });
      }
      
      // Incluir historial de mensajes previos (excluyendo system y documentos ya procesados)
      const filteredMessages = chatMessages.filter(m => 
        m.role !== 'system' && 
        !m.content.includes('Contexto: Tengo acceso a los siguientes documentos PDF')
      );
      
      for (const msg of filteredMessages) {
        content.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
      
      // Agregar mensaje actual del usuario
      const userParts = [{ text: message }];
      
      // Si hay un PDF nuevo en este mensaje que no está en activePdfs, incluirlo
      if (userMessage.pdfData && !activePdfs.some(pdf => pdf.filename === userMessage.pdfData!.filename)) {
        userParts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: userMessage.pdfData.base64
          }
        } as any);
      }
      
      content.push({
        role: 'user',
        parts: userParts
      });

      const result = await model.generateContentStream({
        contents: content,
        systemInstruction: prompt
      });
      let fullResponse = '';
      let lastUpdate = Date.now();
      const updateInterval = 50;

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
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

  // Resto del código de efectos se mantiene igual...
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

  // Los useEffect para PDFs externos se mantienen igual pero deberían actualizar activePdfs también
  useEffect(() => {
    if (externalPdf && !isLoading && processedExternalPdfRef.current !== externalPdf.filename) {
      // Agregar PDF externo a la memoria activa
      setActivePdfs(prev => {
        const exists = prev.some(pdf => pdf.filename === externalPdf.filename);
        if (!exists) {
          return [...prev, externalPdf];
        }
        return prev;
      });

      const analyzeExternalPdf = async () => {
        processedExternalPdfRef.current = externalPdf.filename;
        setIsLoading(true);
        
        const userMessage: Message = { 
          role: 'user', 
          content: `Analiza este documento: ${externalPdf.filename}`,
          pdfData: externalPdf
        };
        setChatMessages(prev => [...prev, userMessage]);

        const streamingMessage: Message = { 
          role: 'assistant', 
          content: '',
          isStreaming: true 
        };
        setChatMessages(prev => [...prev, streamingMessage]);

        try {
          const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const content = [
            prompt,
            `Analiza este documento: ${externalPdf.filename}`,
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: externalPdf.base64
              }
            }
          ];

          const result = await model.generateContentStream(content);
          let fullResponse = '';
          let lastUpdate = Date.now();
          const updateInterval = 50;

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            
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

          setChatMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: fullResponse
            };
            return newMessages;
          });
          processMessage(fullResponse);
          
          if (onExternalPdfProcessed) {
            onExternalPdfProcessed();
          }
        } catch (err) {
          console.error(err);
          setChatMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: 'Lo siento, ocurrió un error al analizar el documento.'
            };
            return newMessages;
          });
        } finally {
          setIsLoading(false);
          processedExternalPdfRef.current = null;
        }
      };

      analyzeExternalPdf();
    }
  }, [externalPdf, isLoading, ai, prompt, processMessage, onExternalPdfProcessed]);

  // useEffect para múltiples PDFs externos
  useEffect(() => {
    if (externalMultiplePdfs && !isLoading) {
      // Agregar PDFs externos a la memoria activa
      setActivePdfs(prev => {
        const newPdfs = externalMultiplePdfs.filter(externalPdf => 
          !prev.some(pdf => pdf.filename === externalPdf.filename)
        );
        return [...prev, ...newPdfs];
      });

      const analyzeMultipleExternalPdfs = async () => {
        setIsLoading(true);
        
        const filenames = externalMultiplePdfs.map(pdf => pdf.filename).join(', ');
        const userMessage: Message = { 
          role: 'user', 
          content: `Analiza estos ${externalMultiplePdfs.length} documentos: ${filenames}`
        };
        setChatMessages(prev => [...prev, userMessage]);

        const streamingMessage: Message = { 
          role: 'assistant', 
          content: '',
          isStreaming: true 
        };
        setChatMessages(prev => [...prev, streamingMessage]);

        try {
          const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
          
          const content = [{
            role: 'user',
            parts: [
              { text: `Analiza estos ${externalMultiplePdfs.length} documentos: ${filenames}` },
              ...externalMultiplePdfs.map(pdf => ({
                inlineData: {
                  mimeType: 'application/pdf',
                  data: pdf.base64
                }
              } as any))
            ]
          }];

          const result = await model.generateContentStream({
            contents: content,
            systemInstruction: prompt
          });
          
          let fullResponse = '';
          let lastUpdate = Date.now();
          const updateInterval = 50;

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            
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

          setChatMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: fullResponse
            };
            return newMessages;
          });
          processMessage(fullResponse);
          
          if (onExternalMultiplePdfsProcessed) {
            onExternalMultiplePdfsProcessed();
          }
        } catch (err) {
          console.error(err);
          setChatMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: 'Lo siento, ocurrió un error al analizar los documentos.'
            };
            return newMessages;
          });
        } finally {
          setIsLoading(false);
        }
      };

      analyzeMultipleExternalPdfs();
    }
  }, [externalMultiplePdfs, isLoading, ai, prompt, processMessage, onExternalMultiplePdfsProcessed]);

  return (
    <div className="w-full lg:w-1/3 glass-panel flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-[#b9d6ee]/10">
        <h2 className="text-lg sm:text-xl font-bold text-[#b9d6ee]">AI Assistant</h2>
        
        {/* NUEVO: Mostrar PDFs activos en memoria */}
        {activePdfs.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-[#b9d6ee]/70">PDFs en memoria:</div>
            {activePdfs.map((pdf, index) => (
              <div key={index} className="flex items-center justify-between bg-[#b9d6ee]/10 rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <Upload className="w-3 h-3 text-[#b9d6ee]" />
                  <span className="text-xs text-[#b9d6ee]">{pdf.filename}</span>
                </div>
                <button
                  onClick={() => removePdfFromMemory(pdf.filename)}
                  className="text-[#b9d6ee]/70 hover:text-red-400"
                  title="Remover de memoria"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {chatMessages
          .filter(m => m.role !== 'system')
          .map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}>
              <div
                className={`max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-lg ${
                  m.role === 'user'
                    ? 'bg-[#b9d6ee] bg-opacity-20 text-white'
                    : 'bg-white bg-opacity-10 text-gray-200'
                }`}
              >
                {m.pdfData && (
                  <div className="flex items-center gap-2 mb-2 text-[#b9d6ee]">
                    <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">{m.pdfData.filename}</span>
                  </div>
                )}
                <div className="markdown-content prose prose-invert max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-[#b9d6ee]" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-[#b9d6ee]" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base sm:text-lg font-bold mb-2 text-[#b9d6ee]" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-4 sm:pl-6 mb-3 sm:mb-4 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-4 sm:pl-6 mb-3 sm:mb-4 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1 text-sm sm:text-base" {...props} />,
                      code: ({inline, className, children, ...props}: CodeProps) => 
                        inline ? 
                          <code className="bg-[#b9d6ee]/10 px-1 sm:px-1.5 py-0.5 rounded text-[#b9d6ee] text-xs sm:text-sm" {...props}>{children}</code> :
                          <code className="block bg-[#b9d6ee]/10 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4 overflow-x-auto text-xs sm:text-sm" {...props}>{children}</code>,
                      blockquote: ({node, ...props}) => 
                        <blockquote className="border-l-4 border-[#b9d6ee] pl-3 sm:pl-4 italic my-3 sm:my-4 text-sm sm:text-base" {...props} />,
                      table: ({node, ...props}) => 
                        <div className="overflow-x-auto mb-3 sm:mb-4">
                          <table className="min-w-full border-collapse text-xs sm:text-sm" {...props} />
                        </div>,
                      th: ({node, ...props}) => 
                        <th className="border border-[#b9d6ee]/20 px-2 sm:px-4 py-1 sm:py-2 bg-[#b9d6ee]/10" {...props} />,
                      td: ({node, ...props}) => 
                        <td className="border border-[#b9d6ee]/20 px-2 sm:px-4 py-1 sm:py-2" {...props} />,
                      a: ({node, ...props}) => 
                        <a className="text-[#b9d6ee] hover:underline text-sm sm:text-base" {...props} />,
                      p: ({node, ...props}) => 
                        <p className="mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base" {...props} />,
                      hr: ({node, ...props}) => 
                        <hr className="my-4 sm:my-6 border-[#b9d6ee]/20" {...props} />,
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
            <div className="glass-panel p-2 sm:p-3 flex gap-1 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#b9d6ee] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#b9d6ee] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#b9d6ee] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-[#b9d6ee]/10">
        {currentPdf && (
          <div className="flex items-center gap-2 mb-2 text-[#b9d6ee]">
            <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">{currentPdf.filename}</span>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <label htmlFor="pdf-upload" className="cursor-pointer p-1.5 sm:p-2 bg-[#b9d6ee]/20 rounded-lg hover:bg-opacity-30 flex-shrink-0">
            <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-[#b9d6ee]" />
          </label>
          <input 
            id="pdf-upload" 
            type="file" 
            accept=".pdf" 
            className="hidden" 
            onChange={handleFileUpload}
            aria-label="Upload PDF document"
          />
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="flex-1 glass-panel px-3 sm:px-4 py-2 text-[#b9d6ee] placeholder-[#b9d6ee]/50 focus:outline-none text-sm sm:text-base"
            placeholder={activePdfs.length > 0 ? "Pregunta sobre tus PDFs..." : "Escribe tu pregunta…"}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="p-1.5 sm:p-2 bg-[#b9d6ee]/20 rounded-lg hover:bg-opacity-30 disabled:opacity-50 flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-[#b9d6ee]" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistant;