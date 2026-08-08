/**
 * Dicionário de dicas de saúde por biomarcador
 * Usado pela Vita IA para exibir explicações leigas e dicas práticas
 * quando um biomarcador está fora da faixa de referência.
 */

export interface HealthTip {
  name: string;
  whatIs: string;
  whenHigh: string;
  whenLow: string;
  tips: string[];
}

export const healthTipsDictionary: Record<string, HealthTip> = {
  GLUCOSE: {
    name: 'Glicose em Jejum',
    whatIs: 'É o nível de açúcar no sangue. Controla sua energia e metabolismo.',
    whenHigh: 'Pode indicar resistência insulínica ou pré-diabetes. O corpo não está usando bem o açúcar.',
    whenLow: 'Pode causar tonturas, fraqueza e desmaios. Pode indicar jejum prolongado.',
    tips: [
      '🥗 Priorize alimentos com baixo índice glicêmico (vegetais, grãos integrais)',
      '🚶 Caminhe 15 min após as refeições para ajudar na absorção',
      '😴 Durma 7-8h por noite — sono ruim aumenta a glicose',
      '🚫 Reduza açúcar refinado e farinhas brancas',
    ],
  },
  INSULIN: {
    name: 'Insulina em Jejum',
    whatIs: 'Hormônio que controla o nível de açúcar no sangue. Produzido pelo pâncreas.',
    whenHigh: 'O corpo está produzindo muita insulina para compensar resistência. Sinal precoce de diabetes.',
    whenLow: 'Pode indicar função pancreática comprometida.',
    tips: [
      '🏋️ Exercícios de força (musculação) melhoram a sensibilidade à insulina',
      '🥑 Inclua gorduras boas: abacate, azeite, castanhas',
      '⏰ Pratique jejum intermitente sob orientação médica',
      '🚫 Evite carboidratos simples em excesso',
    ],
  },
  HBA1C: {
    name: 'Hemoglobina Glicada (HbA1c)',
    whatIs: 'Mostra a média do seu açúcar no sangue nos últimos 3 meses.',
    whenHigh: 'Significa que o açúcar ficou elevado por um período longo. Risco de diabetes.',
    whenLow: 'Geralmente não é preocupante, mas pode indicar anemia.',
    tips: [
      '🥦 Aumente o consumo de fibras (30g/dia)',
      '🏃 Faça atividade aeróbica 150min/semana',
      '📉 Perca peso se estiver acima do ideal — cada 1kg ajuda',
      '💧 Beba 2L de água por dia',
    ],
  },
  TOTAL_CHOLESTEROL: {
    name: 'Colesterol Total',
    whatIs: 'Soma de todas as frações de colesterol. Fundamental para avaliar risco cardiovascular.',
    whenHigh: 'Pode aumentar o risco de doenças do coração e entupimento de artérias.',
    whenLow: 'Colesterol muito baixo pode afetar hormônios e membranas celulares.',
    tips: [
      '🐟 Consuma peixes ricos em ômega-3 (salmão, sardinha) 2-3x/semana',
      '🥜 Inclua castanhas e nozes diariamente',
      '🚫 Reduza frituras e alimentos ultraprocessados',
      '🫀 Faça exercícios aeróbicos regulares',
    ],
  },
  LDL: {
    name: 'LDL Colesterol ("Colesterol Ruim")',
    whatIs: 'Carrega colesterol para as artérias. Em excesso, causa placas de gordura.',
    whenHigh: 'Principal fator de risco para infarto e AVC. Precisa de atenção imediata.',
    whenLow: 'Não costuma ser problemático.',
    tips: [
      '🥗 Dieta mediterrânea é a mais eficaz para reduzir LDL',
      '🧄 Inclua aveia, alho e berinjela na dieta',
      '🏃 30min de exercício aeróbico diário reduz o LDL em até 10%',
      '💊 Converse com seu médico sobre suplementação se necessário',
    ],
  },
  HDL: {
    name: 'HDL Colesterol ("Colesterol Bom")',
    whatIs: 'Remove o colesterol das artérias e protege o coração. Quanto mais alto, melhor!',
    whenHigh: 'Geralmente é protetor! HDL alto é bom.',
    whenLow: 'Aumenta o risco cardiovascular. Precisa elevar.',
    tips: [
      '🏋️ Exercícios intensos elevam o HDL significativamente',
      '🥑 Gorduras boas (azeite, abacate, castanhas) aumentam o HDL',
      '🚭 Parar de fumar pode aumentar o HDL em até 10%',
      '🍷 Álcool moderado pode ajudar, mas com cautela',
    ],
  },
  TRIGLYCERIDES: {
    name: 'Triglicerídeos',
    whatIs: 'Gordura no sangue vinda da alimentação. Em excesso, prejudica o coração e pâncreas.',
    whenHigh: 'Risco de pancreatite e doença cardíaca. Relacionado a excesso de carboidratos e álcool.',
    whenLow: 'Geralmente não é preocupante.',
    tips: [
      '🚫 Corte açúcar refinado — é o maior vilão dos triglicerídeos',
      '🍺 Reduza ou elimine o consumo de álcool',
      '🐟 Ômega-3 (peixe ou suplemento) reduz triglicerídeos em 25-30%',
      '🏃 Exercício aeróbico regular é fundamental',
    ],
  },
  VLDL: {
    name: 'VLDL Colesterol',
    whatIs: 'Transporta triglicerídeos no sangue. Relacionado ao risco cardiovascular.',
    whenHigh: 'Geralmente acompanha triglicerídeos altos. Mesmo risco cardiovascular.',
    whenLow: 'Não costuma ser preocupante.',
    tips: [
      '🥗 Reduza carboidratos refinados e açúcar',
      '🏃 Exercícios aeróbicos diminuem VLDL',
      '🐟 Aumente consumo de ômega-3',
      '💧 Mantenha-se bem hidratado',
    ],
  },
  TSH: {
    name: 'TSH (Hormônio Estimulante da Tireoide)',
    whatIs: 'Controla o funcionamento da tireoide, que regula metabolismo, energia e peso.',
    whenHigh: 'Tireoide lenta (hipotireoidismo): cansaço, ganho de peso, pele seca.',
    whenLow: 'Tireoide acelerada (hipertireoidismo): perda de peso, ansiedade, tremores.',
    tips: [
      '🥜 Inclua alimentos ricos em selênio (castanha-do-pará)',
      '🧘 Gerencie o estresse — cortisol afeta a tireoide',
      '🧂 Use sal iodado na alimentação',
      '🩺 Acompanhe com endocrinologista regularmente',
    ],
  },
  T4_LIVRE: {
    name: 'T4 Livre',
    whatIs: 'Hormônio ativo da tireoide. Regula metabolismo e energia do corpo.',
    whenHigh: 'Hipertireoidismo: metabolismo acelerado, perda de peso involuntária.',
    whenLow: 'Hipotireoidismo: metabolismo lento, cansaço, ganho de peso.',
    tips: [
      '🥜 Selênio (castanha-do-pará) e zinco auxiliam a conversão de T4',
      '🧘 Estresse crônico impacta negativamente a tireoide',
      '💤 Sono adequado é fundamental para equilíbrio tireoidiano',
      '🩺 Nunca ajuste medicação tireoidiana por conta própria',
    ],
  },
  TESTOSTERONE: {
    name: 'Testosterona Total',
    whatIs: 'Principal hormônio masculino. Afeta massa muscular, energia, libido e humor.',
    whenHigh: 'Pode causar acne, agressividade e problemas prostáticos.',
    whenLow: 'Fadiga, perda de massa muscular, baixa libido, depressão.',
    tips: [
      '🏋️ Musculação e HIIT aumentam testosterona naturalmente',
      '😴 Durma 7-9h — a produção ocorre durante o sono profundo',
      '🥩 Proteína adequada e gorduras saudáveis são essenciais',
      '🧘 Reduza estresse — cortisol destrói testosterona',
    ],
  },
  ESTRADIOL: {
    name: 'Estradiol (E2)',
    whatIs: 'Principal estrogênio. Importante para ossos, coração e saúde reprodutiva.',
    whenHigh: 'Homens: pode causar ginecomastia e retenção hídrica. Mulheres: risco de câncer de mama.',
    whenLow: 'Mulheres: ondas de calor, ressecamento vaginal, osteoporose.',
    tips: [
      '🥦 Vegetais crucíferos (brócolis, couve) ajudam a metabolizar estrogênio',
      '🏃 Exercício regular equilibra hormônios',
      '🚫 Evite plásticos com BPA — mimetizam estrogênio',
      '⚖️ Mantenha peso saudável — gordura produz estrogênio',
    ],
  },
  VITAMIN_D: {
    name: 'Vitamina D',
    whatIs: 'Essencial para ossos, imunidade e humor. Produzida pela pele com exposição ao sol.',
    whenHigh: 'Raro, mas pode causar cálcio alto e problemas renais.',
    whenLow: 'Fraqueza muscular, dor óssea, depressão, imunidade baixa.',
    tips: [
      '☀️ Tome 15-20min de sol diário (braços/pernas expostos)',
      '💊 Suplemente com D3 (dose conforme orientação médica)',
      '🐟 Peixes gordos e ovos são fontes alimentares',
      '🧪 Nível ideal: entre 40-60 ng/mL',
    ],
  },
  VITAMIN_B12: {
    name: 'Vitamina B12',
    whatIs: 'Essencial para o sistema nervoso, formação de sangue e energia.',
    whenHigh: 'Raramente problemático, mas pode indicar problemas hepáticos.',
    whenLow: 'Anemia, formigamento, fadiga intensa, problemas de memória.',
    tips: [
      '🥩 Carnes vermelhas e fígado são as melhores fontes',
      '💊 Veganos devem suplementar obrigatoriamente',
      '🥚 Ovos e laticínios também contêm B12',
      '🧪 Nível ideal: acima de 500 pg/mL',
    ],
  },
  FERRITIN: {
    name: 'Ferritina',
    whatIs: 'Reserva de ferro do corpo. Indicador precoce de deficiência de ferro.',
    whenHigh: 'Pode indicar inflamação, infecção ou sobrecarga de ferro (hemocromatose).',
    whenLow: 'Fadiga, queda de cabelo, unhas fracas. Precursor de anemia.',
    tips: [
      '🥩 Carnes vermelhas têm ferro de melhor absorção',
      '🍋 Vitamina C aumenta absorção de ferro vegetal',
      '☕ Evite café/chá junto das refeições — inibem absorção',
      '🩸 Mulheres com menstruação intensa devem monitorar',
    ],
  },
  IRON: {
    name: 'Ferro Sérico',
    whatIs: 'Mineral essencial para transportar oxigênio no sangue.',
    whenHigh: 'Pode causar danos ao fígado e coração. Avaliar com ferritina.',
    whenLow: 'Anemia, cansaço, palidez, dificuldade de concentração.',
    tips: [
      '🥬 Combine fontes de ferro (feijão, lentilha) com vitamina C',
      '🥩 Fígado bovino é a fonte mais rica',
      '🚫 Não tome ferro junto com cálcio ou café',
      '🩺 Avalie se há perda de sangue oculta',
    ],
  },
  HEMOGLOBIN: {
    name: 'Hemoglobina',
    whatIs: 'Proteína dos glóbulos vermelhos que carrega oxigênio. Indicador de anemia.',
    whenHigh: 'Pode indicar desidratação ou policitemia. Sangue mais grosso.',
    whenLow: 'Anemia: cansaço, palidez, falta de ar, tonturas.',
    tips: [
      '🥩 Garanta ingestão adequada de ferro e B12',
      '💧 Mantenha hidratação adequada',
      '🥗 Alimentação variada e rica em nutrientes',
      '🩺 Anemia persistente precisa de investigação médica',
    ],
  },
  HEMATOCRIT: {
    name: 'Hematócrito',
    whatIs: 'Percentual de glóbulos vermelhos no sangue. Complementa a avaliação de anemia.',
    whenHigh: 'Pode indicar desidratação, uso de testosterona ou policitemia.',
    whenLow: 'Anemia ou diluição sanguínea.',
    tips: [
      '💧 Desidratação é a causa mais comum de hematócrito alto',
      '🥩 Se baixo, avalie ferro, B12 e folato',
      '🏔️ Altitude elevada pode aumentar hematócrito naturalmente',
      '🩺 Acompanhe variações com hemograma periódico',
    ],
  },
  RBC: {
    name: 'Hemácias (Eritrócitos)',
    whatIs: 'Células vermelhas que transportam oxigênio para todo o corpo.',
    whenHigh: 'Policitemia: sangue mais grosso, risco de trombose.',
    whenLow: 'Anemia: transporte insuficiente de oxigênio.',
    tips: [
      '🥩 Ferro, B12 e ácido fólico são essenciais para produção',
      '💧 Hidratação adequada é fundamental',
      '🚭 Fumo aumenta hemácias de forma prejudicial',
      '🩺 Avalie causas com hematologista se valores muito alterados',
    ],
  },
  WBC: {
    name: 'Leucócitos (Glóbulos Brancos)',
    whatIs: 'Células de defesa do corpo. Lutam contra infecções e doenças.',
    whenHigh: 'Infecção ativa, inflamação, estresse ou alergias.',
    whenLow: 'Sistema imune comprometido. Maior risco de infecções.',
    tips: [
      '🧄 Alimentos que fortalecem imunidade: alho, gengibre, cúrcuma',
      '😴 Sono de qualidade é essencial para imunidade',
      '🧘 Gerencie estresse crônico — destrói defesas',
      '💊 Vitamina C e zinco suportam função imune',
    ],
  },
  PLATELETS: {
    name: 'Plaquetas',
    whatIs: 'Responsáveis pela coagulação do sangue. Evitam sangramento excessivo.',
    whenHigh: 'Risco de trombose (coágulos). Pode ser reativo a inflamação.',
    whenLow: 'Risco de sangramentos. Pode indicar problemas na medula óssea.',
    tips: [
      '🐟 Ômega-3 tem efeito antiagregante natural',
      '💧 Mantenha boa hidratação',
      '🚫 Evite anti-inflamatórios sem prescrição',
      '🩺 Plaquetas muito alteradas exigem investigação hematológica',
    ],
  },
  CREATININE: {
    name: 'Creatinina',
    whatIs: 'Resíduo do metabolismo muscular. Avalia a função dos rins.',
    whenHigh: 'Rins podem não estar filtrando bem. Também pode ser de massa muscular alta.',
    whenLow: 'Pouca massa muscular ou desnutrição.',
    tips: [
      '💧 Beba bastante água — desidratação eleva creatinina',
      '🚫 Evite anti-inflamatórios frequentes — são tóxicos aos rins',
      '🥩 Excesso de proteína pode elevar temporariamente',
      '🩺 Se persistentemente alta, avalie função renal completa',
    ],
  },
  UREA: {
    name: 'Ureia',
    whatIs: 'Produto do metabolismo de proteínas, eliminada pelos rins.',
    whenHigh: 'Pode indicar problema renal, desidratação ou dieta hiperproteica.',
    whenLow: 'Pode indicar desnutrição ou doença hepática.',
    tips: [
      '💧 Hidratação adequada é fundamental',
      '🥩 Modere o consumo de proteína se muito elevada',
      '🩺 Avalie em conjunto com creatinina para função renal',
      '🚫 Evite uso crônico de anti-inflamatórios',
    ],
  },
  ALT: {
    name: 'TGP / ALT (Transaminase)',
    whatIs: 'Enzima do fígado. Quando alta, indica que o fígado está inflamado ou lesionado.',
    whenHigh: 'Gordura no fígado (esteatose), hepatite, medicamentos ou álcool.',
    whenLow: 'Não costuma ser preocupante.',
    tips: [
      '🚫 Reduza ou elimine o álcool',
      '🥗 Dieta pobre em gordura saturada protege o fígado',
      '🏃 Exercício regular ajuda a reverter fígado gorduroso',
      '💊 Revise medicamentos com seu médico — paracetamol em excesso é tóxico',
    ],
  },
  AST: {
    name: 'TGO / AST (Transaminase)',
    whatIs: 'Enzima encontrada no fígado, coração e músculos.',
    whenHigh: 'Lesão hepática, exercício intenso recente ou problemas cardíacos.',
    whenLow: 'Não costuma ser preocupante.',
    tips: [
      '🍃 Proteja seu fígado: limite álcool e ultraprocessados',
      '🏋️ Exercício intenso pode elevar AST temporariamente (normal)',
      '💧 Boa hidratação ajuda na recuperação hepática',
      '🩺 AST >> ALT pode indicar causa muscular ou cardíaca',
    ],
  },
  GGT: {
    name: 'Gama GT',
    whatIs: 'Enzima hepática sensível ao álcool e medicamentos.',
    whenHigh: 'Consumo de álcool, medicamentos, esteatose hepática.',
    whenLow: 'Não costuma ser preocupante.',
    tips: [
      '🍺 Principal causa de GGT alto é o consumo de álcool',
      '💊 Revise medicamentos com seu médico',
      '🥗 Dieta rica em vegetais e pobre em gordura ajuda',
      '🏃 Exercícios ajudam a metabolizar gordura hepática',
    ],
  },
  ALP: {
    name: 'Fosfatase Alcalina',
    whatIs: 'Enzima encontrada no fígado e ossos.',
    whenHigh: 'Pode indicar problema hepático ou ósseo.',
    whenLow: 'Deficiência de zinco ou magnésio.',
    tips: [
      '🩺 Avaliar em conjunto com GGT para diferenciar origem',
      '🥛 Se for óssea, garanta vitamina D e cálcio adequados',
      '🧪 Pode estar elevada normalmente em adolescentes e gestantes',
      '🥜 Zinco e magnésio ajudam a regular ALP',
    ],
  },
  URIC_ACID: {
    name: 'Ácido Úrico',
    whatIs: 'Resíduo do metabolismo de purinas. Em excesso, cristaliza nas articulações (gota).',
    whenHigh: 'Risco de gota, pedras nos rins e doença cardiovascular.',
    whenLow: 'Pode estar associado a estresse oxidativo baixo.',
    tips: [
      '💧 Beba muito líquido (2-3L/dia)',
      '🚫 Reduza cerveja, carne vermelha em excesso e frutos do mar',
      '🍒 Cereja e vitamina C reduzem ácido úrico naturalmente',
      '⚖️ Perda de peso gradual ajuda (dietas radicais pioram)',
    ],
  },
  HS_CRP: {
    name: 'PCR Ultrassensível',
    whatIs: 'Marcador de inflamação no corpo. Quanto mais baixo, melhor.',
    whenHigh: 'Inflamação crônica — risco cardiovascular, pode indicar infecção ou autoimunidade.',
    whenLow: 'Ótimo! Baixa inflamação é sinal de saúde.',
    tips: [
      '🥗 Dieta anti-inflamatória: ômega-3, cúrcuma, gengibre, vegetais',
      '🏃 Exercício regular reduz inflamação sistêmica',
      '😴 Sono de qualidade é anti-inflamatório natural',
      '🧘 Estresse crônico é pró-inflamatório — medite!',
    ],
  },
  MAGNESIUM: {
    name: 'Magnésio',
    whatIs: 'Mineral essencial para mais de 300 reações no corpo. Regula sono, músculos e estresse.',
    whenHigh: 'Raro, mas pode causar fraqueza muscular e arritmias.',
    whenLow: 'Câimbras, insônia, ansiedade, fadiga. Muito comum na população.',
    tips: [
      '🥬 Fontes: espinafre, abacate, banana, cacau, castanhas',
      '💊 Suplemento de magnésio bisglicinato é o mais absorvido',
      '🛁 Banho com sal de epsom fornece magnésio pela pele',
      '💤 Tomar magnésio antes de dormir melhora o sono',
    ],
  },
  CALCIUM: {
    name: 'Cálcio',
    whatIs: 'Mineral fundamental para ossos, dentes, músculos e coagulação.',
    whenHigh: 'Pode indicar hiperparatireoidismo ou excesso de vitamina D.',
    whenLow: 'Risco de osteoporose, câimbras e formigamentos.',
    tips: [
      '🥛 Laticínios, sardinha e vegetais verde-escuros são fontes',
      '☀️ Vitamina D é essencial para absorver cálcio',
      '🚫 Cafeína em excesso aumenta perda de cálcio',
      '🏋️ Exercícios com impacto fortalecem ossos',
    ],
  },
  MCV: {
    name: 'VCM (Volume Corpuscular Médio)',
    whatIs: 'Tamanho médio das hemácias. Ajuda a classificar tipos de anemia.',
    whenHigh: 'Hemácias grandes: pode indicar deficiência de B12 ou folato.',
    whenLow: 'Hemácias pequenas: pode indicar deficiência de ferro.',
    tips: [
      '🧪 VCM alto + B12 baixa → suplementar B12',
      '🧪 VCM baixo + ferritina baixa → suplementar ferro',
      '🥩 Dieta balanceada com ferro, B12 e folato previne alterações',
      '🩺 Avalie em conjunto com outros índices do hemograma',
    ],
  },
  MCH: {
    name: 'HCM (Hemoglobina Corpuscular Média)',
    whatIs: 'Quantidade média de hemoglobina por hemácia.',
    whenHigh: 'Acompanha VCM alto — mesmas causas e condutas.',
    whenLow: 'Acompanha VCM baixo — mesmas causas e condutas.',
    tips: [
      '🥩 Garanta ingestão adequada de ferro e vitaminas do complexo B',
      '🥗 Alimentação variada é a melhor prevenção',
      '🩺 Avalie em conjunto com VCM e CHCM',
      '💧 Mantenha hidratação adequada',
    ],
  },
  RDW: {
    name: 'RDW (Distribuição Eritrocitária)',
    whatIs: 'Mede a variação de tamanho das hemácias. Ajuda a diagnosticar anemias.',
    whenHigh: 'Hemácias de tamanhos variados: deficiência de ferro, B12 ou folato.',
    whenLow: 'Geralmente normal — hemácias de tamanho uniforme.',
    tips: [
      '🥩 RDW alto com ferritina baixa → deficiência de ferro',
      '💊 Suplementar nutrientes deficientes normaliza o RDW',
      '🩺 RDW alto pode indicar anemia mista',
      '🧪 Monitorar a cada 3-6 meses',
    ],
  },
  ALBUMIN: {
    name: 'Albumina',
    whatIs: 'Principal proteína do sangue. Indica estado nutricional e função hepática.',
    whenHigh: 'Geralmente por desidratação.',
    whenLow: 'Desnutrição, doença hepática ou perda renal de proteínas.',
    tips: [
      '🥩 Garanta ingestão proteica adequada (1.6-2g/kg/dia)',
      '💧 Mantenha hidratação adequada',
      '🩺 Albumina baixa persistente precisa de investigação',
      '🥗 Dieta equilibrada com proteínas de qualidade',
    ],
  },
  HOMOCYSTEINE: {
    name: 'Homocisteína',
    whatIs: 'Aminoácido inflamatório. Em excesso, danifica vasos sanguíneos.',
    whenHigh: 'Risco cardiovascular aumentado. Pode indicar deficiência de B12, B6 ou folato.',
    whenLow: 'Não costuma ser preocupante.',
    tips: [
      '💊 Complexo B (B6, B9, B12) reduz homocisteína eficientemente',
      '🥬 Vegetais verde-escuros são ricos em folato',
      '🥩 B12 de fontes animais ou suplementação',
      '🧪 Nível ideal: abaixo de 8 µmol/L',
    ],
  },
};

/**
 * Retorna a dica de saúde para um biomarcador pelo seu key.
 * Se não encontrado, retorna null.
 */
export function getHealthTip(biomarkerKey: string): HealthTip | null {
  return healthTipsDictionary[biomarkerKey] || null;
}
