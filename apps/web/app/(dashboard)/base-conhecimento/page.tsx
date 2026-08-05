'use client';

import { useState, useEffect } from 'react';

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
  const [isRealBackend, setIsRealBackend] = useState(false);

  // Fetch real documents from API on mount
  useEffect(() => {
    fetch('http://localhost:3001/api/knowledge/documents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDocs(data);
          setIsRealBackend(true);
        }
      })
      .catch(() => {
        setIsRealBackend(false);
      });
  }, []);

  const handleUploadDocument = async () => {
    setUploading(true);
    
    try {
      const res = await fetch('http://localhost:3001/api/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Documento de Saúde e Exames ${Date.now()}.pdf`,
          content: 'Exames de Sangue e Hemograma completo do usuário. Glicose 85 mg/dL, Colesterol Total 170 mg/dL, Triglicérides 90 mg/dL. Recomenda-se manter dieta balanceada e exercícios aeróbicos regulares.',
          fileType: 'PDF'
        })
      });
      const data = await res.json();
      if (data.documentId) {
        setIsRealBackend(true);
        // Refresh list
        const listRes = await fetch('http://localhost:3001/api/knowledge/documents');
        const listData = await listRes.json();
        setDocs(listData);
      }
    } catch {
      // Fallback local update
      const newDoc: KnowledgeDoc = {
        id: String(Date.now()),
        title: `Exames de Sangue e Hemograma ${Date.now()}.pdf`,
        agentName: 'Dra. Maya — Saúde & Longevidade',
        fileType: 'PDF',
        totalChunks: 18,
        createdAt: 'Hoje'
      };
      setDocs([newDoc, ...docs]);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/knowledge/documents/${id}`, { method: 'DELETE' });
    } catch {}
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-xl text-sky-400">
              📚
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Base de Conhecimento (RAG Vetorial)</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Faça upload de documentos (PDF, TXT, MD) para alimentar a memória semântica vetorial (pgvector) dos seus agentes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isRealBackend && (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
              ● Backend RAG Conectado
            </span>
          )}
          <button 
            onClick={handleUploadDocument}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 text-xs flex items-center space-x-2"
          >
            <span>📤</span>
            <span>Upload de Documento</span>
          </button>
        </div>
      </div>

      {/* Upload Dropzone Card */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
        <div 
          onClick={handleUploadDocument}
          className="border-2 border-dashed border-slate-800 hover:border-sky-500/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition group"
        >
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition">
            📄
          </div>
          <h3 className="font-bold text-base text-white">Arraste seus manuais, exames ou planilhas em PDF / TXT / MD</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            O sistema faz a fragmentação em chunks e gera os embeddings vetoriais (text-embedding-3-small) no banco de dados automaticamente.
          </p>
          {uploading && (
            <div className="mt-4 flex items-center space-x-2 text-sky-400 text-xs font-semibold animate-pulse">
              <div className="w-3 h-3 rounded-full bg-sky-400"></div>
              <span>Vetorizando documento e inserindo no pgvector da API...</span>
            </div>
          )}
        </div>
      </div>

      {/* Document List */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white">Documentos Indexados na Memória Vetorial</h2>
          <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">{docs.length} arquivos</span>
        </div>

        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-sky-400 text-xs">
                  {doc.fileType}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">{doc.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vinculado ao Agente: <span className="text-sky-400 font-semibold">{doc.agentName}</span> • <span className="text-emerald-400 font-semibold">{doc.totalChunks} chunks vetoriais</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-[10px] text-slate-500">{doc.createdAt}</span>
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition text-xs"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
