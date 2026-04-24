"use client";

import { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Maximize2, Minimize2, Sparkles, Loader2 } from 'lucide-react';
import BotonTema from '@/components/BotonTema';

// Función para disparar descargas sin abrir pestañas (evita bloqueos de pop-ups)
const triggerDownload = (url) => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  document.body.appendChild(iframe);
  // Eliminamos el iframe después de un tiempo para limpiar el DOM
  setTimeout(() => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
  }, 5000);
};

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Eliminamos openedUrls state ya que causaba desincronización

  const onSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (!response.ok) throw new Error('Fallo en la comunicación');

      // Leemos el stream manualmente para máxima compatibilidad
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      let assistantContent = '';
      const localOpenedUrls = new Set(); // Control local para permitir múltiples aperturas distintas en un mismo mensaje

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // DETECCION DE AUTO-OPEN: Regex "A prueba de balas" que tolera cualquier basura que meta la IA
        const downloadRegex = /AUTO.*?OPEN.*?URL\s*\|\s*([^|]+)\s*\|\s*FIN/gi;
        const matches = Array.from(assistantContent.matchAll(downloadRegex));
        
        for (const [index, match] of matches.entries()) {
            // Limpieza TOTAL de barras invertidas y caracteres de escape
            let urlPart = match[1].replace(/\\/g, '').trim(); 
            
            if (urlPart && !localOpenedUrls.has(urlPart)) {
              console.log("Activando descarga silenciosa segura:", urlPart);
              setTimeout(() => {
                 triggerDownload(urlPart);
              }, index * 800); // Espaciamos un poco más para evadir bloqueos
              localOpenedUrls.add(urlPart);
            }
        }

        // Limpiamos visualmente el comando del chat
        const cleanContent = assistantContent.replace(/AUTO.*?OPEN.*?URL\s*\|\s*[^|]+\s*\|\s*FIN/gi, '');
        
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: cleanContent } : m
        ));
      }
    } catch (err) {
      console.error("Chat Error:", err);
      setError("No se pudo conectar con SSPA-RTACO");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll al fondo cuando lleguen nuevos mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[999] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 group"
        title="Hablar con SSPA-RTACO"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
        <Bot className="w-6 h-6 relative z-10" />
        <div className="absolute top-0 right-0 -mr-1 -mt-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
        <div className="absolute top-0 right-0 -mr-1 -mt-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'w-[calc(100vw-3rem)] md:w-[600px] h-[80vh]' : 'w-[350px] h-[550px]'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-sm tracking-wide flex items-center gap-1">SSPA-RTACO <Sparkles className="w-3 h-3 text-yellow-300" /></h3>
            <span className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
              En línea
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 hover:bg-white/20 rounded-full transition text-white/80 hover:text-white">
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-slate-900 custom-scrollbar" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
              <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">¡Hola! Soy SSPA-RTACO, tu experto IA.</p>
            <p className="text-xs text-gray-400 max-w-[200px]">Puedo descargar reportes, gestionar trabajadores, crear DCs y revisar mantenimientos.</p>
          </div>
        ) : (
          messages.map((m) => (
             m.role === 'tool' ? null : // Ocultar mensajes internos de tools
            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-end gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role !== 'user' && (
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-sm'}`}>
                  {m.content || (isLoading && m.role === 'assistant' && messages[messages.length-1].id === m.id ? (
                    <div className="flex items-center gap-2 text-gray-400 italic">
                      <Loader2 className="w-3 h-3 animate-spin" /> Procesando información...
                    </div>
                  ) : '')}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Helper de carga para tools */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
           <div className="flex items-start gap-2">
             <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shadow-sm">
                <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 px-4 py-2.5 rounded-2xl rounded-bl-none text-xs text-gray-500 shadow-sm flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> Procesando inteligencia...
              </div>
           </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 text-xs p-2 text-center border-t border-red-100">
          Ocurrió un error. Por favor, intenta de nuevo.
        </div>
      )}

      {/* Input de Chat */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 rounded-b-2xl">
        <form onSubmit={onSend} className="flex items-end gap-2 relative">
          <textarea
            className="flex-1 max-h-32 min-h-[44px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none custom-scrollbar"
            placeholder="Pídele un reporte o acción a SSPA-RTACO..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend(e);
              }
            }}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !input}
            className="h-[44px] w-[44px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl transition shadow-sm flex-shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
        <div className="mt-2 text-center">
            <span className="text-[9px] text-gray-400 capitalize">SSPA-RTACO by SERVITEC AI</span>
        </div>
      </div>
    </div>
  );
}
