'use client';

import { useState } from 'react';
import { MessageSquare, Send, Sparkles, Bot, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/api';
import { PageHeader, Button, Input } from '../../../components/ui';

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
      time: '12:00',
    },
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
      time: nowTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await authFetch('/api/multimodal-intake/text', {
        method: 'POST',
        body: JSON.stringify({ text: userText }),
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
          toolBadge: `✓ Intenção: ${intent}`,
        };
        setMessages((prev) => [...prev, vitaReply]);
      } else {
        throw new Error('Erro ao obter resposta da Vita');
      }
    } catch {
      const errorReply: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'vita',
        text: 'Desculpe, ocorreu uma instabilidade ao conectar com o servidor. Tente novamente.',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        toolBadge: '⚠️ Falha de Conexão',
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-75px)] sm:h-[calc(100dvh-90px)] max-w-[1000px] mx-auto pb-2 sm:pb-4">
      {/* Design System Page Header */}
      <PageHeader
        icon={<MessageSquare className="w-5 h-5 text-[#c084fc]" />}
        title="Chat Conversacional Vita"
        subtitle="Interface conversacional com inteligência multimodal (MCP Loop)"
        className="mb-0 border-b-0 pb-0"
      />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-2 sm:py-4 space-y-3 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-2.5 sm:space-x-3 ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 border ${
                m.sender === 'vita'
                  ? 'bg-surface border-subtle text-accent'
                  : 'bg-accent border-accent text-white'
              }`}
            >
              {m.sender === 'vita' ? <Bot className="w-4 h-4" /> : 'U'}
            </div>

            <div
              className={`max-w-[85%] sm:max-w-lg p-3 rounded-lg border text-xs space-y-1.5 break-words ${
                m.sender === 'vita'
                  ? 'bg-surface border-subtle text-primary'
                  : 'bg-elevated border-subtle text-primary'
              }`}
            >
              <p className="leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>

              {m.toolBadge && (
                <div className="text-xs font-mono text-accent bg-accent-subtle px-2 py-0.5 rounded border border-[#5e6ad230] flex items-center gap-1 w-max max-w-full truncate">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span className="truncate">{m.toolBadge}</span>
                </div>
              )}

              <span className="text-xs text-tertiary block text-right font-mono">{m.time}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-surface border border-subtle text-accent flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-lg bg-surface border border-subtle text-xs text-secondary flex items-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              <span>Vita está analisando...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="pt-3 border-t border-subtle flex items-center gap-2 shrink-0">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem, um gasto ou biometria..."
          disabled={loading}
          className="flex-1"
        />

        <Button
          type="submit"
          disabled={loading || !input.trim()}
          isLoading={loading}
          leftIcon={!loading ? <Send className="w-3.5 h-3.5" /> : undefined}
          variant="primary"
        >
          Enviar
        </Button>
      </form>
    </div>
  );
}

