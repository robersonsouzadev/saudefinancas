import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding specialized AI agents...');
  
  const agentsData = [
    {
      name: 'Dra. Maya — Saúde & Longevidade',
      description: 'Especialista em saúde física, sono e longevidade.',
      systemPrompt: 'Seu nome é Dra. Maya. Você é a ESPECIALISTA EM SAÚDE FÍSICA, SONO E LONGEVIDADE do sistema Saúde & Finanças. Sua função é analisar indicadores biológicos (sono, HRV, batimentos, passos), orientar sobre rotinas saudáveis e prevenir estresse metabólico.',
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      isDefault: false
    },
    {
      name: 'Otávio — Estrategista Financeiro',
      description: 'Consultor financeiro e estrategista orçamentário.',
      systemPrompt: 'Seu nome é Otávio. Você é o CONSULTOR FINANCEIRO E ESTRATEGISTA ORÇAMENTÁRIO do sistema Saúde & Finanças. Sua função é analisar extratos, identificar despesas desnecessárias, sugerir metas de economia e categorizar transações automaticamente.',
      modelName: 'gpt-4o-mini',
      temperature: 0.5,
      isDefault: false
    },
    {
      name: 'Nutri Bia — Nutrição & Macros',
      description: 'Especialista nutricional e visão computacional.',
      systemPrompt: 'Seu nome é Nutri Bia. Você é a ESPECIALISTA NUTRICIONAL E VISÃO COMPUTACIONAL do sistema Saúde & Finanças. Sua função é analisar fotos de refeições enviadas pelo usuário, extrair calorias/macronutrientes da Tabela TACO e sugerir ajustes na dieta.',
      modelName: 'gpt-4o-mini',
      temperature: 0.6,
      isDefault: false
    },
    {
      name: 'Vita — Orquestradora Geral',
      description: 'Orquestradora principal de bem-estar integrado.',
      systemPrompt: 'Seu nome é Vita. Você é a ORQUESTRADORA PRINCIPAL DE BEM-ESTAR INTEGRADO (Saúde + Finanças). Sua função é correlacionar o impacto do estresse financeiro na saúde biológica do usuário e vice-versa, fornecendo relatórios executivos unificados.',
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      isDefault: true
    }
  ];

  const agentMap: Record<string, string> = {};

  for (const ag of agentsData) {
    const existing = await prisma.agent.findFirst({ where: { name: ag.name } });
    if (!existing) {
      const created = await prisma.agent.create({ data: ag });
      agentMap[ag.name] = created.id;
      console.log(`Agent created: ${ag.name}`);
    } else {
      agentMap[ag.name] = existing.id;
    }
  }

  console.log('Seeding transaction categories...');
  const categories = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Salário', 'Investimentos'];
  for (const name of categories) {
    const existingCat = await prisma.transactionCategory.findFirst({ where: { name } });
    if (!existingCat) {
      await prisma.transactionCategory.create({ data: { name } });
    }
  }

  console.log('Seeding real RAG Knowledge Documents...');
  const filesToSeed = [
    {
      fileName: 'Tabela_TACO_Composicao_Alimentos_Brasileira.txt',
      title: 'Tabela TACO — Composição de Alimentos Brasileira.pdf',
      agentName: 'Nutri Bia — Nutrição & Macros',
      fileType: 'PDF',
      chunks: 142
    },
    {
      fileName: 'Guia_Treino_Hipertrofia_Longevidade.txt',
      title: 'Guia de Treino de Hipertrofia e Longevidade.pdf',
      agentName: 'Dra. Maya — Saúde & Longevidade',
      fileType: 'PDF',
      chunks: 38
    },
    {
      fileName: 'Planejamento_Orcamentario_Metas_2026.txt',
      title: 'Planejamento Orçamentário e Metas 2026.txt',
      agentName: 'Otávio — Estrategista Financeiro',
      fileType: 'TXT',
      chunks: 12
    }
  ];

  const kbDir = path.join(__dirname, '../../../knowledge_base_files');

  for (const f of filesToSeed) {
    const filePath = path.join(kbDir, f.fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const agentId = agentMap[f.agentName] || agentMap['Vita — Orquestradora Geral'];

      const existingDoc = await prisma.knowledgeDocument.findFirst({ where: { title: f.title } });
      if (!existingDoc) {
        const doc = await prisma.knowledgeDocument.create({
          data: {
            agentId,
            title: f.title,
            fileType: f.fileType,
            totalChunks: f.chunks,
          }
        });

        // Seed initial text chunks
        await prisma.knowledgeChunk.create({
          data: {
            documentId: doc.id,
            content: content.slice(0, 1000),
            chunkIndex: 0,
          }
        });
        console.log(`Document indexed: ${f.title}`);
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

