'use client';

import { useState } from 'react';
import { MessageSquare, Send, Mic, Sparkles, Bot, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/api';

interface ChatMessage {
  id: string;
  sender: 'vita' | 'user';
  text: string;
  time: string;
  toolBadge?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'vita',
      text: 'Olá! Eu sou a Vita, sua assistente pessoal de bem-estar integrado. Como posso te ajudar hoje? Você pode enviar mensagens de texto ou dúvidas sobre suas finanças e saúde!',
      time: '12:00'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userText,
      time: nowTime
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await authFetch('/api/multimodal-intake/text', {
        method: 'POST',
        body: JSON.stringify({ text: userText })
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        const replyText = data.vitaInsight || data.vita_insight || 'Mensagem processada e sincronizada!';
        const intent = data.intent || data.primary_intent || 'GERAL';

        const vitaReply: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'vita',
          text: replyText,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          toolBadge: `✓ Intenção: ${intent}`
        };
        setMessages(prev => [...prev, vitaReply]);
      } else {
        throw new Error('Erro ao obter resposta da Vita');
      }
    } catch (err: any) {
      const errorReply: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'vita',
        text: 'Desculpe, ocorreu uma instabilidade ao conectar com o servidor. Tente novamente.',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        toolBadge: '⚠️ Falha de Conexão'
      };
      setMessages(prev => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] text-[#f7f8f8] max-w-5xl mx-auto pb-4">
      
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-[#ffffff0e] pb-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#c084fc]">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Chat Conversacional Vita</h1>
          <p className="text-xs text-[#8a8f98]">Interface conversacional com inteligência multimodal (MCP Loop)</p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex items-start space-x-3 ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
              m.sender === 'vita' 
                ? 'bg-[#16191e] border-[#ffffff12] text-[#5e6ad2]' 
                : 'bg-[#5e6ad2] border-[#5e6ad2] text-white'
            }`}>
              {m.sender === 'vita' ? <Bot className="w-4 h-4" /> : 'U'}
            </div>

            <div className={`max-w-lg p-3 rounded-lg border text-xs space-y-1.5 ${
              m.sender === 'vita' 
                ? 'bg-[#0f1115] border-[#ffffff0e] text-[#f7f8f8]' 
                : 'bg-[#16191e] border-[#ffffff12] text-[#f7f8f8]'
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

              {m.toolBadge && (
                <div className="text-[10px] font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2 py-0.5 rounded border border-[#5e6ad230] flex items-center gap-1 w-max">
                  <Sparkles className="w-3 h-3" />
                  <span>{m.toolBadge}</span>
                </div>
              )}

              <span className="text-[10px] text-[#575c66] block text-right font-mono">{m.time}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#16191e] border border-[#ffffff12] text-[#5e6ad2] flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-lg bg-[#0f1115] border border-[#ffffff0e] text-xs text-[#8a8f98] flex items-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5e6ad2]" />
              <span>Vita está analisando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="pt-3 border-t border-[#ffffff0e] flex items-center space-x-2 flex-shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem, um gasto ou biometria..."
          className="flex-1 h-10 px-4 rounded-md bg-[#0f1115] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
          disabled={loading}
        />

        <button 
          type="submit"
          disabled={loading || !input.trim()}
          className="h-10 px-4 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] disabled:opacity-50 text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Enviar</span>
        </button>
      </form>

    </div>
  );
}
