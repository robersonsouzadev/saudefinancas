'use client';

import { useState } from 'react';
import { MessageSquare, Send, Mic, Paperclip, Sparkles, Bot, CheckCircle2 } from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'vita',
      text: 'Olá! Eu sou a Vita, sua assistente pessoal de bem-estar integrado. Como posso te ajudar hoje? Você pode enviar mensagens de texto, fotos de refeições ou gravação de voz!',
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
      text: 'Perfeito! Registrei o gasto de R$ 45,00 na categoria Alimentação e o log de 7.0 horas de sono. Seu score de bem-estar subiu 2 pontos!',
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

    setTimeout(() => {
      const vitaReply = {
        id: String(Date.now() + 1),
        sender: 'vita',
        text: `Compreendido! Analisei o comando "${input}". Os dados foram atualizados e sincronizados no diário de biometria e finanças.`,
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
      const voiceMsg = {
        id: String(Date.now()),
        sender: 'user',
        text: '🎙️ [Áudio Transcrito via Whisper]: "Comprei um remédio na farmácia por 35 reais"',
        time: 'Agora'
      };
      setMessages(prev => [...prev, voiceMsg]);

      setTimeout(() => {
        const reply = {
          id: String(Date.now() + 1),
          sender: 'vita',
          text: 'Áudio processado com sucesso! Registrei a despesa de R$ 35,00 em Saúde & Farmácia.',
          time: 'Agora',
          toolBadge: '✓ Whisper API + log_transaction'
        };
        setMessages(prev => [...prev, reply]);
      }, 1000);
    }, 2000);
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
          <p className="text-xs text-[#8a8f98]">Interface conversacional com execução em tempo real de ferramentas (MCP Loop)</p>
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
              <p className="leading-relaxed">{m.text}</p>

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
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="pt-3 border-t border-[#ffffff0e] flex items-center space-x-2 flex-shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem, um gasto ou biometria..."
          className="flex-1 h-10 px-4 rounded-md bg-[#0f1115] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
        />

        <button 
          type="button" 
          onClick={handleVoiceRecord}
          className={`h-10 px-3 rounded-md border text-xs flex items-center space-x-1.5 transition ${
            recording 
              ? 'bg-[#f8717120] text-[#f87171] border-[#f8717140] animate-pulse' 
              : 'bg-[#0f1115] border-[#ffffff12] text-[#8a8f98] hover:text-[#f7f8f8]'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>{recording ? 'Gravando...' : 'Áudio'}</span>
        </button>

        <button 
          type="submit"
          className="h-10 px-4 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Enviar</span>
        </button>
      </form>

    </div>
  );
}
