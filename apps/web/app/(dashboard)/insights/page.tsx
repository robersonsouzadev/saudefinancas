export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Insights e Correlações</h1>
      <p className="text-slate-500">Descubra como seus hábitos de saúde impactam suas finanças.</p>
      
      <div className="space-y-4">
        <div className="glass-card p-6 border-l-4 border-l-red-500">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold rounded mb-2">Crítico</span>
              <h3 className="text-lg font-medium">Gatilho de Estresse e Gastos</h3>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Nos dias em que seu nível de estresse está acima de 8, seus gastos supérfluos aumentam em média 45%.</p>
            </div>
            <div className="flex space-x-2">
              <button className="text-slate-400 hover:text-emerald-500 transition">👍</button>
              <button className="text-slate-400 hover:text-red-500 transition">👎</button>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold rounded mb-2">Atenção</span>
              <h3 className="text-lg font-medium">Impacto do Sono na Alimentação</h3>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Sua ingestão calórica excede a meta em dias após dormir menos de 6 horas.</p>
            </div>
            <div className="flex space-x-2">
              <button className="text-slate-400 hover:text-emerald-500 transition">👍</button>
              <button className="text-slate-400 hover:text-red-500 transition">👎</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
