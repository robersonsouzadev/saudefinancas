'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Plus,
  PieChart,
  Sparkles,
  Building2,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  EmptyState,
} from '../../../components/ui';

interface AssetItem {
  id: string;
  ticker: string;
  name: string;
  type: 'FII' | 'ACAO' | 'RENDA_FIXA' | 'TESOURO' | 'CRIPTO';
  broker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  targetPercent: number;
}

const initialAssets: AssetItem[] = [];

export default function InvestimentosPage() {
  const [assets, setAssets] = useState<AssetItem[]>(initialAssets);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [availableContribution, setAvailableContribution] = useState(1500);

  // Form State
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'FII' | 'ACAO' | 'RENDA_FIXA' | 'TESOURO' | 'CRIPTO'>('FII');
  const [broker, setBroker] = useState('XP Investimentos');
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [currentPriceInput, setCurrentPriceInput] = useState('');
  const [targetPercent, setTargetPercent] = useState('');

  // Computations
  const totalInvested = assets.reduce((s, a) => s + a.quantity * a.averagePrice, 0);
  const currentTotalValue = assets.reduce((s, a) => s + a.quantity * a.currentPrice, 0);
  const totalProfit = currentTotalValue - totalInvested;
  const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setTicker('');
    setName('');
    setType('FII');
    setBroker('XP Investimentos');
    setQuantity('');
    setAveragePrice('');
    setCurrentPriceInput('');
    setTargetPercent('');
    setShowModal(true);
  };

  const handleOpenEdit = (asset: AssetItem) => {
    setEditingAsset(asset);
    setTicker(asset.ticker);
    setName(asset.name);
    setType(asset.type);
    setBroker(asset.broker);
    setQuantity(String(asset.quantity));
    setAveragePrice(String(asset.averagePrice));
    setCurrentPriceInput(String(asset.currentPrice));
    setTargetPercent(String(asset.targetPercent));
    setShowModal(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !averagePrice) return;

    const qty = parseFloat(quantity);
    const avg = parseFloat(averagePrice);
    const curr = currentPriceInput ? parseFloat(currentPriceInput) : avg * 1.02;

    if (editingAsset) {
      setAssets(
        assets.map((a) =>
          a.id === editingAsset.id
            ? {
                ...a,
                ticker: ticker.toUpperCase(),
                name: name || ticker.toUpperCase(),
                type,
                broker,
                quantity: qty,
                averagePrice: avg,
                currentPrice: curr,
                targetPercent: parseFloat(targetPercent) || 10,
              }
            : a
        )
      );
    } else {
      const newAsset: AssetItem = {
        id: String(Date.now()),
        ticker: ticker.toUpperCase(),
        name: name || ticker.toUpperCase(),
        type,
        broker,
        quantity: qty,
        averagePrice: avg,
        currentPrice: curr,
        targetPercent: parseFloat(targetPercent) || 10,
      };
      setAssets([...assets, newAsset]);
    }

    setShowModal(false);
  };

  const handleDeleteAsset = (id: string) => {
    if (!confirm('Deseja remover este ativo da carteira?')) return;
    setAssets(assets.filter((a) => a.id !== id));
  };

  // AI Rebalance Calculation Logic
  const calculateAiAdvice = () => {
    return assets.map((a) => {
      const currentVal = a.quantity * a.currentPrice;
      const currentPercent = currentTotalValue > 0 ? (currentVal / currentTotalValue) * 100 : 0;
      const deficitPercent = Math.max(0, a.targetPercent - currentPercent);
      const suggestedAmount = deficitPercent > 0 ? availableContribution * (deficitPercent / 100) : 0;

      return {
        ...a,
        currentPercent: currentPercent.toFixed(1),
        suggestedAmount: Math.round(suggestedAmount),
      };
    });
  };

  const adviceItems = calculateAiAdvice();

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Design System Page Header */}
      <PageHeader
        icon={<TrendingUp className="w-5 h-5 text-[#10b981]" />}
        title="Carteira de Investimentos"
        subtitle="Ações, FIIs, Renda Fixa e Aportes Inteligentes com IA (XP / B3)"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent" />}
              onClick={() => setShowAdviceModal(true)}
            >
              IA Dicas de Aporte
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenAdd}
            >
              Adicionar Ativo
            </Button>
          </>
        }
      />

      {/* Patrimony Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="standard">
          <span className="text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase tracking-wider block mb-1">Patrimônio Atual</span>
          <div className="text-3xl sm:text-4xl font-bold font-mono text-primary">
            R$ {currentTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-[#a1a1aa] font-medium block mt-1">Avaliação a mercado</span>
        </Card>

        <Card padding="standard">
          <span className="text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase tracking-wider block mb-1">Total Aportado</span>
          <div className="text-3xl sm:text-4xl font-bold font-mono text-secondary">
            R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-[#a1a1aa] font-medium block mt-1">Custo acumulado de aquisição</span>
        </Card>

        <Card padding="standard">
          <span className="text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase tracking-wider block mb-1">Rentabilidade Total</span>
          <div className={`text-3xl sm:text-4xl font-bold font-mono ${totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
            {totalProfit >= 0 ? '+' : ''} R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-[#a1a1aa] font-medium block mt-1">Lucro ou prejuízo não realizado</span>
        </Card>

        <Card padding="standard">
          <span className="text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase tracking-wider block mb-1">Retorno (%)</span>
          <div className={`text-3xl font-bold font-mono ${profitPercentage >= 0 ? 'text-success' : 'text-error'}`}>
            {profitPercentage >= 0 ? '+' : ''} {profitPercentage.toFixed(2)}%
          </div>
          <span className="text-[11px] text-secondary block">Rentabilidade da carteira</span>
        </Card>
      </div>

      {/* Portfolio Breakdown by Asset */}
      <Card padding="standard">
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            <span>Ativos em Carteira (XP / Corretora)</span>
          </h3>
          <Badge variant="neutral">{assets.length} ativos cadastrados</Badge>
        </div>

        {assets.length === 0 ? (
          <EmptyState
            icon={<PieChart className="w-6 h-6 text-tertiary" />}
            title="Nenhum ativo cadastrado na carteira"
            description="Clique em '+ Adicionar Ativo' para registrar suas posições em Ações, FIIs ou Renda Fixa da XP."
          />
        ) : (
          <>
            {/* Mobile Card List (< 640px) */}
            <div className="space-y-3 sm:hidden">
              {assets.map((a) => {
                const invested = a.quantity * a.averagePrice;
                const currentVal = a.quantity * a.currentPrice;
                const profit = currentVal - invested;
                const profitPct = invested > 0 ? (profit / invested) * 100 : 0;

                return (
                  <div key={a.id} className="p-3 rounded-md bg-surface border border-subtle space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm font-mono text-primary">{a.ticker}</span>
                        <span className="text-[10px] text-secondary block">{a.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" size="sm">{a.type}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(a)} className="h-6 w-6 p-0">
                          <Edit3 className="w-3.5 h-3.5 text-secondary" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(a.id)} className="h-6 w-6 p-0 text-error">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-1 border-t border-b border-subtle text-[11px] font-mono">
                      <div>
                        <span className="text-secondary block text-[10px]">Posição Atual</span>
                        <span className="font-bold text-primary">R$ {currentVal.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-secondary block text-[10px]">Resultado</span>
                        <span className={`font-bold ${profit >= 0 ? 'text-success' : 'text-error'}`}>
                          {profit >= 0 ? '+' : ''} R$ {profit.toFixed(2)} ({profitPct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] text-secondary font-mono">
                      <span>Qtd: {a.quantity}</span>
                      <span>PM: R$ {a.averagePrice.toFixed(2)}</span>
                      <span>Atual: R$ {a.currentPrice.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (≥ 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-subtle text-tertiary uppercase font-semibold text-[10px]">
                    <th className="pb-3 px-3">Ativo / Ticker</th>
                    <th className="pb-3 px-3">Tipo</th>
                    <th className="pb-3 px-3">Corretora</th>
                    <th className="pb-3 px-3 text-right">Qtd</th>
                    <th className="pb-3 px-3 text-right">Preço Médio</th>
                    <th className="pb-3 px-3 text-right">Cotação Atual</th>
                    <th className="pb-3 px-3 text-right">Total Investido</th>
                    <th className="pb-3 px-3 text-right">Resultado</th>
                    <th className="pb-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle text-primary">
                  {assets.map((a) => {
                    const invested = a.quantity * a.averagePrice;
                    const currentVal = a.quantity * a.currentPrice;
                    const profit = currentVal - invested;
                    const profitPct = invested > 0 ? (profit / invested) * 100 : 0;

                    return (
                      <tr key={a.id} className="hover:bg-elevated transition-colors">
                        <td className="py-3 px-3 font-medium">
                          <span className="font-bold block font-mono text-primary">{a.ticker}</span>
                          <span className="text-[10px] text-secondary font-sans">{a.name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="neutral" size="sm">{a.type}</Badge>
                        </td>
                        <td className="py-3 px-3 font-mono text-secondary">{a.broker}</td>
                        <td className="py-3 px-3 text-right font-mono text-primary">{a.quantity}</td>
                        <td className="py-3 px-3 text-right font-mono text-secondary">R$ {a.averagePrice.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-primary">R$ {a.currentPrice.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-primary">R$ {currentVal.toFixed(2)}</td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${profit >= 0 ? 'text-success' : 'text-error'}`}>
                          {profit >= 0 ? '+' : ''} R$ {profit.toFixed(2)} ({profitPct.toFixed(1)}%)
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(a)} className="h-7 w-7 p-0 text-secondary">
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(a.id)} className="h-7 w-7 p-0 text-tertiary hover:text-error">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Add / Edit Asset Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingAsset ? 'Editar Ativo da Carteira' : 'Cadastrar Novo Ativo'}
        description="Preencha as informações do ativo para atualizar sua carteira de investimentos."
      >
        <form onSubmit={handleSaveAsset} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="TICKER / CÓDIGO"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="ex: HGLG11, PETR4"
              required
              className="font-mono"
            />

            <Select
              label="TIPO DE ATIVO"
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              options={[
                { value: 'FII', label: 'Fundos Imobiliários (FII)' },
                { value: 'ACAO', label: 'Ações Brasil' },
                { value: 'RENDA_FIXA', label: 'Renda Fixa / CDB' },
                { value: 'TESOURO', label: 'Tesouro Direto' },
                { value: 'CRIPTO', label: 'Criptoativos' },
              ]}
            />
          </div>

          <Input
            label="NOME DO ATIVO"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: CSHG Logística FII"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="QUANTIDADE"
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              required
              className="font-mono"
            />

            <Input
              label="PREÇO MÉDIO (R$)"
              type="number"
              step="0.01"
              value={averagePrice}
              onChange={(e) => setAveragePrice(e.target.value)}
              placeholder="160.00"
              required
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="COTAÇÃO ATUAL (R$)"
              type="number"
              step="0.01"
              value={currentPriceInput}
              onChange={(e) => setCurrentPriceInput(e.target.value)}
              placeholder="Auto (opcional)"
              className="font-mono"
            />

            <Input
              label="META NA CARTEIRA (%)"
              type="number"
              value={targetPercent}
              onChange={(e) => setTargetPercent(e.target.value)}
              placeholder="25"
              className="font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingAsset ? 'Atualizar Ativo' : 'Salvar Ativo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI Advice Modal */}
      <Modal
        isOpen={showAdviceModal}
        onClose={() => setShowAdviceModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Recomendador de Aporte Inteligente IA</span>
          </span>
        }
        description="A IA calcula o rebalanceamento ideal da sua carteira."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <Input
            label="VALOR DISPONÍVEL PARA APORTE (R$)"
            type="number"
            value={availableContribution}
            onChange={(e) => setAvailableContribution(Number(e.target.value))}
            className="font-mono font-bold text-sm"
          />

          <div className="p-3 rounded bg-surface border border-subtle text-secondary space-y-1 text-[11px]">
            <strong className="text-primary block">🤖 Diagnóstico da IA (Agente Otávio):</strong>
            <p>
              Com base no valor de <strong>R$ {availableContribution.toLocaleString('pt-BR')}</strong>, a IA calculou a distribuição ideal para rebalancear a sua carteira até atingir a meta estipulada de cada ativo:
            </p>
          </div>

          <div className="space-y-2">
            {adviceItems.length === 0 ? (
              <p className="text-center text-secondary py-4">Nenhum ativo cadastrado para recomendar aporte.</p>
            ) : (
              adviceItems.map((item) => (
                <div key={item.id} className="p-3 rounded bg-surface border border-subtle flex items-center justify-between font-mono">
                  <div>
                    <span className="font-bold text-primary">{item.ticker}</span>
                    <span className="text-[10px] text-secondary block">
                      Atual: {item.currentPercent}% (Meta: {item.targetPercent}%)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-success font-bold">R$ {item.suggestedAmount.toLocaleString('pt-BR')}</span>
                    <span className="text-[10px] text-secondary block">Aporte Sugerido</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setShowAdviceModal(false)} variant="primary">
              Concluído
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

