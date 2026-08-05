'use client';

import { useState } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'vita',
      text: 'Olá! Eu sou a Vita, sua assistente pessoal de bem-estar integrado. Como posso te ajudar hoje? Você pode mandar texto, foto de refeição ou gravar um áudio!',
      time: '12:00'
    },
    {
      id: '2',
      sender: 'user',
      text: 'Gastei 45 reais no almoço e dormi 7 horas essa noite',
      time: '12:01'
    },
    {
      id: '3',
      sender: 'vita',
      text: 'Perfeito! Registrei o gasto de *R$ 45,00 em Alimentação* e seu log de *7 horas de sono* com qualidade boa. Seu marcador de bem-estar subiu 2 pontos! 🚀',
      time: '12:01',
      toolBadge: '✓ Tools executadas: log_transaction & log_health'
    }
  ]);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = {
      id: String(Date.now()),
      sender: 'user',
      text: input,
      time: 'Agora'
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Simulate Vita AI Response
    setTimeout(() => {
      const vitaReply = {
        id: String(Date.now() + 1),
        sender: 'vita',
        text: `Compreendido! Analisei seu pedido "${input}". Todos os dados foram atualizados e sincronizados no seu diário e no painel financeiro.`,
        time: 'Agora',
        toolBadge: '✓ Ferramenta Vita executada'
      };
      setMessages(prev => [...prev, vitaReply]);
    }, 1000);
  };

  const handleVoiceRecord = () => {
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      setInput('Gastei 32 reais na farmácia e caminhei 30 minutos hoje à tarde.');
    }, 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] text-white">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-bold text-slate-950 text-lg">
            V
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Vita — Assistente de Bem-Estar</h2>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online • Whisper & Multi-LLM
            </p>
          </div>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
          Uazapi & Web Connected
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl overflow-y-auto space-y-4 shadow-xl backdrop-blur-xl">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-end space-x-2 max-w-[85%] sm:max-w-[70%]">
              {msg.sender === 'vita' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-bold text-slate-950 text-xs flex-shrink-0 mb-1">
                  V
                </div>
              )}
              <div 
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-medium rounded-tr-none' 
                    : 'bg-slate-800 border border-slate-700/70 text-slate-100 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                {msg.toolBadge && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                    {msg.toolBadge}
                  </span>
                )}
              </div>
              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs flex-shrink-0 mb-1">
                  U
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="mt-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center space-x-3 shadow-2xl">
        <button 
          type="button" 
          onClick={handleVoiceRecord}
          className={`p-3 rounded-xl border transition ${
            recording 
              ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse' 
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
          title="Gravar áudio com Whisper STT"
        >
          🎙️ {recording ? 'Gravando...' : ''}
        </button>

        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite ou fale com a Vita (ex: 'Gastei 50 reais no mercado')..." 
          className="flex-1 bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        <button 
          type="submit"
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold text-xs hover:opacity-95 transition shadow-lg shadow-sky-500/20 flex items-center space-x-1"
        >
          <span>Enviar</span>
          <span>➤</span>
        </button>
      </form>
    </div>
  );
}
