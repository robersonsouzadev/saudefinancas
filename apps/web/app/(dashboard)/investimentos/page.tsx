'use client';

import { useState } from 'react';
import { 
  TrendingUp, Plus, DollarSign, PieChart, Sparkles, 
  ArrowUpRight, ArrowDownRight, Layers, Building2, Calculator, Check, AlertCircle, ShieldCheck
} from 'lucide-react';

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

const initialAssets: AssetItem[] = [
  { id: '1', ticker: 'HGLG11', name: 'CSHG Logística FII', type: 'FII', broker: 'XP Investimentos', quantity: 20, averagePrice: 160.00, currentPrice: 164.50, targetPercent: 35 },
  { id: '2', ticker: 'PETR4', name: 'Petróleo Brasileiro S.A.', type: 'ACAO', broker: 'XP Investimentos', quantity: 100, averagePrice: 35.50, currentPrice: 38.20, targetPercent: 25 },
  { id: '3', ticker: 'CDB XP 110% CDI', name: 'CDB Banco XP S.A.', type: 'RENDA_FIXA', broker: 'XP Investimentos', quantity: 1, averagePrice: 5000.00, currentPrice: 5240.00, targetPercent: 40 },
];

export default function InvestimentosPage() {
  const [assets, setAssets] = useState<AssetItem[]>(initialAssets);
  const [showModal, setShowModal] = useState(false);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [availableContribution, setAvailableContribution] = useState(1500);

  // Form State
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'FII' | 'ACAO' | 'RENDA_FIXA' | 'TESOURO' | 'CRIPTO'>('FII');
  const [broker, setBroker] = useState('XP Investimentos');
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [targetPercent, setTargetPercent] = useState('');

  // Computations
  const totalInvested = assets.reduce((s, a) => s + (a.quantity * a.averagePrice), 0);
  const currentTotalValue = assets.reduce((s, a) => s + (a.quantity * a.currentPrice), 0);
  const totalProfit = currentTotalValue - totalInvested;
  const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !averagePrice) return;

    const qty = parseFloat(quantity);
    const avg = parseFloat(averagePrice);
    const curr = avg * 1.02; // initial market price estimate

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
    setTicker('');
    setName('');
    setQuantity('');
    setAveragePrice('');
    setTargetPercent('');
    setShowModal(false);
  };

  // AI Rebalance Calculation Logic
  const calculateAiAdvice = () => {
    return assets.map(a => {
      const currentVal = a.quantity * a.currentPrice;
      const currentPercent = currentTotalValue > 0 ? (currentVal / currentTotalValue) * 100 : 0;
      const deficitPercent = Math.max(0, a.targetPercent - currentPercent);
      const suggestedAmount = deficitPercent > 0 ? (availableContribution * (deficitPercent / 100)) : 0;

      return {
        ...a,
        currentPercent: currentPercent.toFixed(1),
        suggestedAmount: Math.round(suggestedAmount),
      };
    });
  };

  const adviceItems = calculateAiAdvice();

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#10b981]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Carteira de Investimentos</h1>
            <p className="text-xs text-[#8a8f98]">Ações, FIIs, Renda Fixa e Aportes Inteligentes com IA (XP / B3)</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowAdviceModal(true)}
            className="h-8 px-3 rounded-md bg-[#16191e] hover:bg-[#1d2127] border border-[#ffffff12] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>IA Dicas de Aporte</span>
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Ativo</span>
          </button>
        </div>
      </div>

      {/* Patrimony Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Patrimônio Atual</span>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">
            R$ {currentTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#8a8f98] block">Avaliação a mercado</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Total Aportado</span>
          <div className="text-3xl font-bold font-mono text-[#8a8f98]">
            R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#8a8f98] block">Custo acumulado de aquisição</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Rentabilidade Total</span>
          <div className={`text-3xl font-bold font-mono ${totalProfit >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
            {totalProfit >= 0 ? '+' : ''} R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#8a8f98] block">Lucro ou prejuízo não realizado</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Retorno (%)</span>
          <div className={`text-3xl font-bold font-mono ${profitPercentage >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
            {profitPercentage >= 0 ? '+' : ''} {profitPercentage.toFixed(2)}%
          </div>
          <span className="text-[11px] text-[#8a8f98] block">Rentabilidade da carteira</span>
        </div>
      </div>

      {/* Portfolio Breakdown by Asset */}
      <div className="linear-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
          <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#5e6ad2]" />
            <span>Ativos em Carteira (XP / Corretora)</span>
          </h3>
          <span className="text-[11px] font-mono text-[#8a8f98]">{assets.length} ativos cadastrados</span>
        </div>

        {assets.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-[#ffffff0a] rounded-md">
            <PieChart className="w-8 h-8 text-[#575c66] mx-auto" />
            <h4 className="text-xs font-semibold text-[#f7f8f8]">Nenhum ativo cadastrado na carteira</h4>
            <p className="text-[11px] text-[#8a8f98] max-w-sm mx-auto">
              Clique em "+ Adicionar Ativo" para registrar suas posições em Ações, FIIs ou Renda Fixa da XP.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[#575c66] border-b border-[#ffffff0e] uppercase font-semibold text-[10px]">
                <tr>
                  <th className="pb-3">Ativo / Ticker</th>
                  <th className="pb-3">Tipo</th>
                  <th className="pb-3">Corretora</th>
                  <th className="pb-3 text-right">Qtd</th>
                  <th className="pb-3 text-right">Preço Médio</th>
                  <th className="pb-3 text-right">Cotação Atual</th>
                  <th className="pb-3 text-right">Total Investido</th>
                  <th className="pb-3 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff0a]">
                {assets.map((a) => {
                  const invested = a.quantity * a.averagePrice;
                  const currentVal = a.quantity * a.currentPrice;
                  const profit = currentVal - invested;
                  const profitPct = invested > 0 ? (profit / invested) * 100 : 0;

                  return (
                    <tr key={a.id} className="hover:bg-[#16191e] transition">
                      <td className="py-3 font-medium text-[#f7f8f8]">
                        <span className="font-bold block font-mono">{a.ticker}</span>
                        <span className="text-[10px] text-[#8a8f98] font-sans">{a.name}</span>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#16191e] border border-[#ffffff08] text-[#8a8f98]">
                          {a.type}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[#8a8f98]">{a.broker}</td>
                      <td className="py-3 text-right font-mono text-[#f7f8f8]">{a.quantity}</td>
                      <td className="py-3 text-right font-mono text-[#8a8f98]">R$ {a.averagePrice.toFixed(2)}</td>
                      <td className="py-3 text-right font-mono text-[#f7f8f8]">R$ {a.currentPrice.toFixed(2)}</td>
                      <td className="py-3 text-right font-mono font-bold text-[#f7f8f8]">R$ {currentVal.toFixed(2)}</td>
                      <td className={`py-3 text-right font-mono font-bold ${profit >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                        {profit >= 0 ? '+' : ''} R$ {profit.toFixed(2)} ({profitPct.toFixed(1)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8]">Cadastrar Novo Ativo na Carteira</h3>
              <button onClick={() => setShowModal(false)} className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs">✕</button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Ticker / Código</label>
                  <input 
                    type="text" 
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    placeholder="ex: HGLG11, PETR4"
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Tipo de Ativo</label>
                  <select 
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none"
                  >
                    <option value="FII">Fundos Imobiliários (FII)</option>
                    <option value="ACAO">Ações Brasil</option>
                    <option value="RENDA_FIXA">Renda Fixa / CDB</option>
                    <option value="TESOURO">Tesouro Direto</option>
                    <option value="CRIPTO">Criptoativos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Nome do Ativo</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: CSHG Logística FII"
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Quantidade</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="10"
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Preço Médio (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={averagePrice}
                    onChange={(e) => setAveragePrice(e.target.value)}
                    placeholder="160.00"
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]" 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Corretora</label>
                  <input 
                    type="text" 
                    value={broker}
                    onChange={(e) => setBroker(e.target.value)}
                    placeholder="XP Investimentos"
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Meta na Carteira (%)</label>
                  <input 
                    type="number" 
                    value={targetPercent}
                    onChange={(e) => setTargetPercent(e.target.value)}
                    placeholder="25"
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none" 
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="h-8 px-3 rounded bg-[#16191e] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#ffffff0a]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="h-8 px-4 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium shadow-sm"
                >
                  Salvar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Advice Modal */}
      {showAdviceModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg p-6 w-full max-w-lg space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#5e6ad2]" />
                <h3 className="font-semibold text-sm text-[#f7f8f8]">Recomendador de Aporte Inteligente IA</h3>
              </div>
              <button onClick={() => setShowAdviceModal(false)} className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Valor Disponível para Aporte (R$)</label>
                <input 
                  type="number" 
                  value={availableContribution}
                  onChange={(e) => setAvailableContribution(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono font-bold text-sm focus:outline-none" 
                />
              </div>

              <div className="p-3 rounded bg-[#16191e] border border-[#ffffff0a] text-[#8a8f98] space-y-1 text-[11px]">
                <strong className="text-[#f7f8f8] block">🤖 Diagnóstico da IA (Agente Otávio):</strong>
                <p>
                  Com base no valor de <strong>R$ {availableContribution.toLocaleString('pt-BR')}</strong>, a IA calculou a distribuição ideal para rebalancear a sua carteira até atingir a meta estipulada de cada ativo:
                </p>
              </div>

              <div className="space-y-2">
                {adviceItems.map(item => (
                  <div key={item.id} className="p-3 rounded bg-[#16191e] border border-[#ffffff0a] flex items-center justify-between font-mono">
                    <div>
                      <span className="font-bold text-[#f7f8f8]">{item.ticker}</span>
                      <span className="text-[10px] text-[#8a8f98] block">Atual: {item.currentPercent}% (Meta: {item.targetPercent}%)</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[#4ade80] font-bold">R$ {item.suggestedAmount.toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-[#8a8f98] block">Aporte Sugerido</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  onClick={() => setShowAdviceModal(false)}
                  className="h-8 px-4 rounded bg-[#5e6ad2] text-white font-medium shadow-sm"
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
