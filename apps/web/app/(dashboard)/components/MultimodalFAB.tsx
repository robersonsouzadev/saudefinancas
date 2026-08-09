'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  Mic, Camera, Type, X, Send, Loader2, CheckCircle2, 
  Image, FileText, Paperclip, Square, AlertCircle
} from 'lucide-react';
import { authFetch, getAuthToken } from '@/lib/api';

type TabType = 'voice' | 'photo' | 'text';
type ProcessingStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error';

interface IntakeResult {
  intent: string;
  registeredItems: Array<{ type: string; description: string }>;
  vitaInsight: string;
}

export default function MultimodalFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Text tab state
  const [textInput, setTextInput] = useState('');

  // Voice tab state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Photo tab state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageContext, setImageContext] = useState('');
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // API Base URL
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

  // ═══════════════════════════════════════
  // VOICE RECORDING (MediaRecorder API)
  // ═══════════════════════════════════════
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoice(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setErrorMsg('Permissão de microfone negada. Habilite nas configurações do navegador.');
      setStatus('error');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const processVoice = async (audioBlob: Blob) => {
    setStatus('processing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const token = getAuthToken();
      const res = await fetch('/api/multimodal-intake/voice', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Erro ao processar áudio.');
      }

      const data = await res.json();
      setResult(data);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar áudio. Tente novamente.');
      setStatus('error');
    }
  };

  // ═══════════════════════════════════════
  // PHOTO PROCESSING
  // ═══════════════════════════════════════
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processPhoto = async () => {
    if (!imagePreview) return;
    setStatus('processing');
    try {
      const base64 = imagePreview.split(',')[1];
      const res = await authFetch('/api/multimodal-intake/photo', {
        method: 'POST',
        body: JSON.stringify({ image: base64, mimeType: imageMimeType, context: imageContext }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Erro ao processar imagem.');
      }

      const data = await res.json();
      setResult(data);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar imagem. Tente novamente.');
      setStatus('error');
    }
  };

  // ═══════════════════════════════════════
  // TEXT PROCESSING
  // ═══════════════════════════════════════
  const processText = async () => {
    if (!textInput.trim()) return;
    setStatus('processing');
    try {
      const res = await authFetch('/api/multimodal-intake/text', {
        method: 'POST',
        body: JSON.stringify({ text: textInput }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Erro ao processar texto.');
      }

      const data = await res.json();
      setResult(data);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar texto. Tente novamente.');
      setStatus('error');
    }
  };

  // ═══════════════════════════════════════
  // RESET & CLOSE
  // ═══════════════════════════════════════
  const resetState = () => {
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    setTextInput('');
    setImagePreview(null);
    setImageContext('');
    setRecordingTime(0);
  };

  const handleClose = () => {
    resetState();
    setIsOpen(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getIntentLabel = (intent: string) => {
    const labels: Record<string, string> = {
      FINANCE: '💰 Financeiro',
      NUTRITION: '🍽️ Nutricional',
      HEALTH: '❤️ Saúde',
      MEDICATION: '💊 Medicamento',
      HYBRID: '🔀 Misto (Financeiro + Nutricional)',
    };
    return labels[intent] || intent;
  };

  return (
    <>
      {/* ═══ FLOATING ACTION BUTTON ═══ */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#5e6ad2] hover:bg-[#6e7be2] text-white shadow-xl shadow-[#5e6ad220] flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        >
          <div className="relative">
            <Mic className="w-6 h-6 group-hover:scale-110 transition" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#4ade80] rounded-full border-2 border-[#5e6ad2] animate-pulse"></span>
          </div>
        </button>
      )}

      {/* ═══ MODAL OVERLAY ═══ */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="w-full sm:max-w-md bg-[#0f1115] border border-[#ffffff12] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#ffffff0e]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#5e6ad2] flex items-center justify-center">
                  <Mic className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f7f8f8]">Vita IA — Registro Inteligente</h3>
                  <p className="text-xs text-[#cbd5e1] font-medium">Fale, fotografe ou escreva. A IA faz o resto.</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-[#a1a1aa] hover:text-[#f7f8f8] transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Selector */}
            {status === 'idle' && (
              <div className="px-5 pt-3 flex space-x-1.5 bg-[#0f1115]">
                {([
                  { key: 'voice' as TabType, icon: Mic, label: 'Áudio' },
                  { key: 'photo' as TabType, icon: Camera, label: 'Foto' },
                  { key: 'text' as TabType, icon: Type, label: 'Texto' },
                ]).map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key); resetState(); }}
                    className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition ${
                      activeTab === key
                        ? 'bg-[#5e6ad2] text-white shadow-sm'
                        : 'bg-[#16191e] text-[#cbd5e1] hover:bg-[#1d2127] hover:text-[#f7f8f8]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Content Area */}
            <div className="p-5 min-h-[200px]">

              {/* ═══ IDLE STATE: Input Forms ═══ */}
              {status === 'idle' && activeTab === 'voice' && (
                <div className="text-center space-y-4">
                  <p className="text-xs sm:text-sm font-medium text-[#cbd5e1]">
                    Segure o botão e fale normalmente. Exemplos:
                  </p>
                  <div className="space-y-1.5 text-xs text-[#cbd5e1] font-mono bg-[#16191e] p-3 rounded-lg border border-[#ffffff0e]">
                    <p>&quot;Comprei pão 4 reais e carne 30 reais&quot;</p>
                    <p>&quot;Almocei arroz, feijão e frango grelhado&quot;</p>
                    <p>&quot;Dormi 7 horas, humor 8&quot;</p>
                  </div>

                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isRecording
                        ? 'bg-[#f87171] scale-110 shadow-xl shadow-[#f8717130] animate-pulse'
                        : 'bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] hover:border-[#5e6ad2]'
                    }`}
                  >
                    {isRecording ? (
                      <Square className="w-6 h-6 text-white" />
                    ) : (
                      <Mic className="w-8 h-8 text-[#5e6ad2]" />
                    )}
                  </button>

                  {isRecording && (
                    <div className="space-y-1">
                      <p className="text-sm font-mono text-[#f87171] animate-pulse">● GRAVANDO</p>
                      <p className="text-xs font-mono text-[#a1a1aa]">{formatTime(recordingTime)}</p>
                    </div>
                  )}

                  {!isRecording && (
                    <p className="text-xs text-[#71717a]">Segure para gravar • Solte para enviar</p>
                  )}
                </div>
              )}

              {status === 'idle' && activeTab === 'photo' && (
                <div className="space-y-3">
                  {!imagePreview ? (
                    <div className="space-y-3">
                      <p className="text-xs text-[#a1a1aa]">
                        Tire uma foto do prato, cupom fiscal ou comprovante de pagamento.
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => cameraInputRef.current?.click()}
                          className="p-4 bg-[#16191e] border border-[#ffffff12] rounded-lg hover:bg-[#1d2127] hover:border-[#5e6ad2] text-center space-y-2 transition"
                        >
                          <Camera className="w-6 h-6 text-[#5e6ad2] mx-auto" />
                          <span className="text-xs text-[#f7f8f8] font-medium block">Câmera</span>
                        </button>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-4 bg-[#16191e] border border-[#ffffff12] rounded-lg hover:bg-[#1d2127] hover:border-[#5e6ad2] text-center space-y-2 transition"
                        >
                          <Image className="w-6 h-6 text-[#4ade80] mx-auto" />
                          <span className="text-xs text-[#f7f8f8] font-medium block">Galeria / Arquivo</span>
                        </button>
                      </div>

                      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
                      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleImageSelect} />

                      <div className="p-2 bg-[#16191e] border border-[#ffffff0a] rounded text-xs text-[#71717a] text-center">
                        Aceita: JPG, PNG, PDF, DOC, TXT
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border border-[#ffffff12]">
                        <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                        <button
                          onClick={() => setImagePreview(null)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Contexto (opcional): ex: almoço, compras do mercado"
                        value={imageContext}
                        onChange={(e) => setImageContext(e.target.value)}
                        className="w-full bg-[#16191e] border border-[#ffffff12] rounded-md px-3 py-2 text-xs text-[#f7f8f8] placeholder:text-[#71717a] focus:outline-none focus:border-[#5e6ad2]"
                      />

                      <button
                        onClick={processPhoto}
                        className="w-full py-2.5 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar para Vita IA
                      </button>
                    </div>
                  )}
                </div>
              )}

              {status === 'idle' && activeTab === 'text' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#a1a1aa]">
                    Digite o que quiser registrar — a IA classifica automaticamente.
                  </p>

                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Ex: Comprei pão R$4, carne R$30 e uma coca-cola 350ml"
                    rows={3}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded-md px-3 py-2 text-xs text-[#f7f8f8] placeholder:text-[#71717a] focus:outline-none focus:border-[#5e6ad2] resize-none"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); processText(); } }}
                  />

                  <div className="space-y-1 text-xs text-[#71717a] font-mono">
                    <p>💰 &quot;Gastei 50 reais no supermercado&quot;</p>
                    <p>🍽️ &quot;Comi arroz, feijão e bife no almoço&quot;</p>
                    <p>🔀 &quot;Almocei fora, paguei 25 reais, comi salada com frango&quot;</p>
                  </div>

                  <button
                    onClick={processText}
                    disabled={!textInput.trim()}
                    className="w-full py-2.5 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar para Vita IA
                  </button>
                </div>
              )}

              {/* ═══ PROCESSING STATE ═══ */}
              {status === 'processing' && (
                <div className="text-center space-y-4 py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#5e6ad215] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#5e6ad2] animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f7f8f8]">Vita IA processando...</p>
                    <p className="text-xs text-[#a1a1aa] mt-1">
                      Classificando intenção e extraindo dados automaticamente
                    </p>
                  </div>
                  <div className="flex justify-center space-x-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-[#5e6ad2] animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ SUCCESS STATE ═══ */}
              {status === 'success' && result && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 mx-auto rounded-full bg-[#4ade8015] flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-[#4ade80]" />
                    </div>
                    <p className="text-sm font-semibold text-[#4ade80]">Registrado com Sucesso!</p>
                    <span className="inline-block text-xs font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2 py-0.5 rounded border border-[#5e6ad230]">
                      {getIntentLabel(result.intent)}
                    </span>
                  </div>

                  {/* Registered Items */}
                  <div className="bg-[#16191e] border border-[#ffffff0a] rounded-md p-3 space-y-1.5">
                    {result.registeredItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-[#f7f8f8]">{item.description}</span>
                        <span className="text-xs font-mono text-[#a1a1aa] bg-[#0f1115] px-2 py-0.5 rounded">
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Vita Insight */}
                  {result.vitaInsight && (
                    <div className="p-3 bg-[#5e6ad210] border border-[#5e6ad220] rounded-md text-xs text-[#a1a1aa]">
                      <span className="text-[#5e6ad2] font-semibold">🧠 Vita IA: </span>
                      {result.vitaInsight}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={resetState}
                      className="flex-1 py-2 rounded-md bg-[#16191e] hover:bg-[#1d2127] text-[#f7f8f8] text-xs font-medium transition"
                    >
                      + Novo Registro
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 py-2 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-medium transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}

              {/* ═══ ERROR STATE ═══ */}
              {status === 'error' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#f8717115] flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-[#f87171]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f87171]">Erro ao Processar</p>
                    <p className="text-xs text-[#a1a1aa] mt-1">{errorMsg || 'Tente novamente.'}</p>
                  </div>
                  <button
                    onClick={resetState}
                    className="px-4 py-2 rounded-md bg-[#16191e] hover:bg-[#1d2127] text-[#f7f8f8] text-xs font-medium transition"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-5 py-2 border-t border-[#ffffff0a] text-center text-xs text-[#71717a]">
              🧠 Motor GPT-4o-mini Vision • 🎙️ Whisper STT • 📱 Também disponível via WhatsApp
            </div>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
