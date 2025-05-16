import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const N8N_WEBHOOK_URL = 'https://cretum.app.n8n.cloud/webhook/cretum';

// Función para generar un ID de sesión único
const generateSessionId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface AIAssistantProps {
  onCompanySelected: (company: string, ticker: string) => void;
  stocks: Array<{ symbol: string; name: string }>;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ onCompanySelected, stocks }) => {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy Kevin tu Robo Advisor de IA. ¿Como puedo ayudarte hoy?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [processedPatterns] = useState(new Set<string>());

  // Función para procesar el mensaje y detectar el patrón
  const processMessage = (content: string) => {
    const pattern = /!([A-Z]+),\s*([^!]+)!/g;
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      const [fullMatch, ticker, companyName] = match;
      
      // Verificar si este patrón ya fue procesado
      if (!processedPatterns.has(fullMatch)) {
        console.log('Detectado patrón de empresa:', { ticker, companyName });
        onCompanySelected(companyName.trim(), ticker);
        processedPatterns.add(fullMatch);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    const userMessage = { 
      role: 'user' as const, 
      content: message
    };
    setChatMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      console.log('Enviando mensaje al webhook:', {
        prompt: message,
        sessionId
      });

      const queryParams = new URLSearchParams({
        prompt: message,
        sessionId: sessionId
      });

      const response = await fetch(`${N8N_WEBHOOK_URL}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Error en la respuesta del servidor: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Datos recibidos del webhook:', data);

      let streamedContent = '';
      const responseText = Array.isArray(data) && data[0]?.output 
        ? data[0].output 
        : 'Lo siento, no pude procesar tu solicitud.';
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        isStreaming: true 
      }]);

      // Hacer el streaming más rápido y procesar patrones en tiempo real
      for (let i = 0; i < responseText.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 5));
        streamedContent += responseText[i];
        
        // Procesar el contenido actual en busca de patrones
        processMessage(streamedContent);
        
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: streamedContent,
                    isStreaming: true
                  };
                  return newMessages;
                });
              }

      // Finalizar el streaming
              setChatMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
          content: responseText,
                  isStreaming: false
                };
                return newMessages;
              });

    } catch (error) {
      console.error('Error completo:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check for company information in the latest assistant message
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage?.role === 'assistant') {
      // Look for text between ! marks
        const matches = lastMessage.content.match(/!([\w\s,.]+)!/);
        if (matches && matches[1]) {
          const companyName = matches[1];
          
          // Find the ticker for the company
          const stock = stocks.find(s => s.name === companyName);
          if (stock) {
            onCompanySelected(companyName, stock.symbol);
          } else {
            // If exact match not found, try to find a partial match
            const partialMatch = stocks.find(s => 
              companyName.toLowerCase().includes(s.name.toLowerCase()) || 
              s.name.toLowerCase().includes(companyName.toLowerCase())
            );
            if (partialMatch) {
              onCompanySelected(companyName, partialMatch.symbol);
          }
        }
      }
    }
  }, [chatMessages, stocks, onCompanySelected]);

  return (
    <div className="w-1/3 glass-panel flex flex-col">
      <div className="p-4 border-b border-[#b9d6ee]/10">
        <h2 className="text-xl font-bold text-[#b9d6ee]">AI Assistant</h2>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } mb-4`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-[#b9d6ee] bg-opacity-20 text-white'
                  : 'bg-white bg-opacity-10 text-gray-200'
              }`}
            >
              <div className="markdown-content prose prose-invert max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-4">{children}</p>,
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-[#b9d6ee]">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold mb-3 text-[#b9d6ee]">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-bold mb-2 text-[#b9d6ee]">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="ml-4">{children}</li>,
                    code: ({ children }) => (
                      <code className="bg-[#b9d6ee]/10 px-2 py-1 rounded text-[#b9d6ee] font-mono text-sm">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-[#b9d6ee]/10 p-4 rounded-lg overflow-x-auto mb-4">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-[#b9d6ee] pl-4 italic my-4">
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a 
                        href={href} 
                        className="text-[#b9d6ee] hover:text-[#b9d6ee]/80 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-4">
                        <table className="min-w-full border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-[#b9d6ee]/20 px-4 py-2 text-left bg-[#b9d6ee]/10">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-[#b9d6ee]/20 px-4 py-2">
                        {children}
                      </td>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-[#b9d6ee]">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-[#b9d6ee]/90">
                        {children}
                      </em>
                    ),
                  }}
                >
                    {message.content}
                  </ReactMarkdown>
                </div>
            </div>
          </div>
        ))}
        {isLoading && !chatMessages[chatMessages.length - 1]?.isStreaming && (
          <div className="flex justify-start">
            <div className="glass-panel p-3">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-[#b9d6ee] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#b9d6ee] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#b9d6ee] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-[#b9d6ee]/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 glass-panel px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#b9d6ee] text-[#b9d6ee] placeholder-[#b9d6ee]/50"
            placeholder="Ask anything about your investments..."
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="p-2 bg-[#b9d6ee] bg-opacity-20 rounded-lg hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed button-glow"
            disabled={isLoading}
            title="Send message"
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