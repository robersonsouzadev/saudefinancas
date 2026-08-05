'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Upload, FileText, Trash2, Database, Plus, CheckCircle2 } from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  agentName: string;
  fileType: string;
  totalChunks: number;
  createdAt: string;
}

const initialDocs: KnowledgeDoc[] = [
  {
    id: '1',
    title: 'Tabela TACO — Composição de Alimentos Brasileira.pdf',
    agentName: 'Nutri Bia — Nutrição & Macros',
    fileType: 'PDF',
    totalChunks: 142,
    createdAt: '05/08/2026'
  },
  {
    id: '2',
    title: 'Guia de Treino de Hipertrofia e Longevidade.pdf',
    agentName: 'Dra. Maya — Saúde & Longevidade',
    fileType: 'PDF',
    totalChunks: 38,
    createdAt: '04/08/2026'
  },
  {
    id: '3',
    title: 'Planejamento Orçamentário e Metas 2026.txt',
    agentName: 'Otávio — Estrategista Financeiro',
    fileType: 'TXT',
    totalChunks: 12,
    createdAt: '05/08/2026'
  }
];

export default function BaseConhecimentoPage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(initialDocs);
  const [uploading, setUploading] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:3001');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'app.robersonsouza.com.br' || hostname.includes('robersonsouza.com.br')) {
        setApiBaseUrl('https://app.robersonsouza.com.br');
      } else {
        setApiBaseUrl(`http://${hostname}:3001`);
      }
    }
  }, []);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/knowledge/documents`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDocs(data);
        }
      })
      .catch(() => {});
  }, [apiBaseUrl]);

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setTimeout(() => {
      const newDoc: KnowledgeDoc = {
        id: String(Date.now()),
        title: file.name,
        agentName: 'Vita — Assistente Principal',
        fileType: file.name.split('.').pop()?.toUpperCase() || 'PDF',
        totalChunks: Math.floor(Math.random() * 40) + 10,
        createdAt: new Date().toLocaleDateString('pt-BR')
      };
      setDocs([newDoc, ...docs]);
      setUploading(false);
    }, 1200);
  };

  const handleDelete = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#facc15]">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Base de Conhecimento (RAG Vetorial)</h1>
            <p className="text-xs text-[#8a8f98]">Memória semântica vetorial (pgvector) para consultas dos agentes</p>
          </div>
        </div>

        <label className="h-8 px-3 rounded-md bg-[#f7f8f8] hover:bg-[#e1e2e2] text-[#080a0c] font-medium text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer">
          <Upload className="w-3.5 h-3.5" />
          <span>Upload de Documento</span>
          <input type="file" onChange={handleSimulatedUpload} className="hidden" accept=".pdf,.txt,.md" />
        </label>
      </div>

      {/* Upload Dropzone Container */}
      <div className="linear-card p-8 text-center space-y-3 flex flex-col items-center justify-center border-dashed">
        <div className="w-10 h-10 rounded-md bg-[#16191e] border border-[#ffffff10] flex items-center justify-center text-[#8a8f98]">
          <FileText className="w-5 h-5" />
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[#f7f8f8]">Arraste manuais, exames ou planilhas em PDF / TXT / MD</h3>
          <p className="text-xs text-[#8a8f98] mt-1 max-w-md">
            O sistema faz a fragmentação automática em chunks e gera os embeddings vetoriais (text-embedding-3-small) no PostgreSQL.
          </p>
        </div>

        <label className="h-8 px-3 rounded-md bg-[#16191e] hover:bg-[#1d2127] border border-[#ffffff12] text-xs font-medium text-[#f7f8f8] cursor-pointer transition flex items-center space-x-1.5">
          <span>{uploading ? 'Processando Embeddings...' : 'Selecionar Arquivo'}</span>
          <input type="file" onChange={handleSimulatedUpload} className="hidden" accept=".pdf,.txt,.md" />
        </label>
      </div>

      {/* Indexed Documents Table */}
      <div className="linear-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
          <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#5e6ad2]" />
            <span>Documentos Indexados na Memória Vetorial</span>
          </h3>
          <span className="text-[11px] font-mono text-[#8a8f98]">{docs.length} arquivos</span>
        </div>

        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md flex items-center justify-between hover:border-[#ffffff14] transition">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded bg-[#080a0c] border border-[#ffffff0a] flex items-center justify-center font-mono font-bold text-[10px] text-[#facc15]">
                  {doc.fileType}
                </div>
                <div>
                  <h4 className="font-medium text-xs text-[#f7f8f8]">{doc.title}</h4>
                  <span className="text-[11px] text-[#8a8f98] block">
                    Vinculado ao Agente: <strong className="text-[#f7f8f8]">{doc.agentName}</strong> · <span className="font-mono text-[#5e6ad2]">{doc.totalChunks} chunks vetoriais</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs font-mono text-[#8a8f98]">
                <span>{doc.createdAt}</span>
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 hover:bg-[#272a30] rounded text-[#575c66] hover:text-[#f87171] transition"
                  title="Remover Documento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
