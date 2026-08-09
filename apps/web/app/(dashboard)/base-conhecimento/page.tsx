'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Upload, FileText, Trash2, Database } from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Badge,
} from '../../../components/ui';

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
    createdAt: '05/08/2026',
  },
  {
    id: '2',
    title: 'Guia de Treino de Hipertrofia e Longevidade.pdf',
    agentName: 'Dra. Maya — Saúde & Longevidade',
    fileType: 'PDF',
    totalChunks: 38,
    createdAt: '04/08/2026',
  },
  {
    id: '3',
    title: 'Planejamento Orçamentário e Metas 2026.txt',
    agentName: 'Otávio — Estrategista Financeiro',
    fileType: 'TXT',
    totalChunks: 12,
    createdAt: '05/08/2026',
  },
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
      .then((res) => res.json())
      .then((data) => {
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
        createdAt: new Date().toLocaleDateString('pt-BR'),
      };
      setDocs([newDoc, ...docs]);
      setUploading(false);
    }, 1200);
  };

  const handleDelete = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Design System Page Header */}
      <PageHeader
        icon={<BookOpen className="w-5 h-5 text-warning" />}
        title="Base de Conhecimento (RAG Vetorial)"
        subtitle="Memória semântica vetorial (pgvector) para consultas dos agentes"
        actions={
          <label className="h-8 px-3 rounded-md bg-[#f7f8f8] hover:bg-[#e1e2e2] text-[#080a0c] font-medium text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload de Documento</span>
            <input type="file" onChange={handleSimulatedUpload} className="hidden" accept=".pdf,.txt,.md" />
          </label>
        }
      />

      {/* Upload Dropzone Container */}
      <Card padding="expanded" className="border-dashed text-center flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-md bg-surface border border-subtle flex items-center justify-center text-tertiary mb-1">
          <FileText className="w-5 h-5" />
        </div>

        <div>
          <h3 className="font-semibold text-sm text-primary">Arraste manuais, exames ou planilhas em PDF / TXT / MD</h3>
          <p className="text-xs text-secondary mt-1 max-w-md">
            O sistema faz a fragmentação automática em chunks e gera os embeddings vetoriais (text-embedding-3-small) no PostgreSQL.
          </p>
        </div>

        <label className="mt-3 h-8 px-3 rounded-md bg-surface hover:bg-elevated border border-subtle text-xs font-medium text-primary cursor-pointer transition flex items-center space-x-1.5">
          <span>{uploading ? 'Processando Embeddings...' : 'Selecionar Arquivo'}</span>
          <input type="file" onChange={handleSimulatedUpload} className="hidden" accept=".pdf,.txt,.md" />
        </label>
      </Card>

      {/* Indexed Documents Table */}
      <Card padding="standard">
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            <span>Documentos Indexados na Memória Vetorial</span>
          </h3>
          <Badge variant="neutral">{docs.length} arquivos</Badge>
        </div>

        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="p-3 bg-surface border border-subtle rounded-md flex items-center justify-between hover:border-hover transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded bg-canvas border border-subtle flex items-center justify-center font-mono font-bold text-[10px] text-warning">
                  {doc.fileType}
                </div>
                <div>
                  <h4 className="font-medium text-xs text-primary">{doc.title}</h4>
                  <span className="text-[11px] text-secondary block">
                    Vinculado ao Agente: <strong className="text-primary">{doc.agentName}</strong> ·{' '}
                    <span className="font-mono text-accent">{doc.totalChunks} chunks vetoriais</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs font-mono text-secondary">
                <span>{doc.createdAt}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  className="text-tertiary hover:text-error h-7 w-7 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
