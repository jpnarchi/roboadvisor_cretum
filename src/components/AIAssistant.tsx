import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CRETUM_WEBHOOK_URL = 'https://cretum.app.n8n.cloud/webhook-test/cretum';

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
    { role: 'assistant', content: 'Hola! Soy tu Robo Advisor de IA. ¿Como puedo ayudarte hoy?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent, overrideMessage?: string) => {
    e.preventDefault();
    const messageToSend = overrideMessage || message;
    if (!messageToSend.trim() || isLoading) return;
    
    setMessage('');
    setIsLoading(true);

    setChatMessages(prev => [...prev, { role: 'user', content: messageToSend }]);

    try {
      const response = await fetch(CRETUM_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          context: {
            stocks: stocks,
            previousMessages: chatMessages.slice(-5) // Enviar últimos 5 mensajes para contexto
          }
        })
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();
      
      // Simular streaming de la respuesta
      let streamedContent = '';
      for (let i = 0; i < data.response.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        streamedContent += data.response[i];
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

      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: data.response,
          isStreaming: false
        };
        return newMessages;
      });

    } catch (error) {
      console.error('Error:', error);
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
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
          >
            <Send className="w-5 h-5 text-[#b9d6ee]" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistant; 