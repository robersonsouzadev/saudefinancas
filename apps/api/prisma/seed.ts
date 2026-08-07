import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Super Admin user...');
  const adminEmail = 'robersonsouza@outlook.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Mudar123!', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Roberson Souza (Super Admin)',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        authProvider: 'LOCAL',
      },
    });
    console.log(`Super Admin user created: ${adminEmail}`);
  } else {
    // Ensure Super Admin has ADMIN role and is active
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`Super Admin user verified/updated: ${adminEmail}`);
  }

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
      name: 'Coach Iron — Personal Trainer & Musculação',
      description: 'Especialista em musculação, hipertrofia, força, periodização e sobrecarga progressiva.',
      systemPrompt: 'Seu nome é Coach Iron. Você é o PERSONAL TRAINER E PREPARADOR FÍSICO VIRTUAL do sistema Saúde & Finanças. Sua função é criar treinos personalizados baseados nos objetivos do usuário (hipertrofia, força, definição, resistência), calcular progressão de carga, gerenciar volume de treinos por grupo muscular e orientar sobre a execução dos exercícios.',
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

  console.log('Seeding 1,323 3D exercises with animated GIFs from ExerciseGymGifsDB CDN...');
  const cdnBaseUrl = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0';
  const muscleFolders = [
    'pectorals', 'lats', 'delts', 'biceps', 'triceps', 'quads', 'hamstrings',
    'abs', 'glutes', 'calves', 'forearms', 'traps', 'upper-back', 'abductors',
    'adductors', 'cardio', 'levator-scapulae', 'serratus-anterior', 'spine',
  ];

  const muscleGroupMap: Record<string, string> = {
    pectorals: 'PEITORAL', lats: 'DORSAL', delts: 'OMBRO', biceps: 'BICEPS',
    triceps: 'TRICEPS', quads: 'QUADRICEPS', hamstrings: 'POSTERIOR_COXA',
    abs: 'ABDOMEN', glutes: 'GLUTEOS', calves: 'PANTURRILHA', forearms: 'ANTEBRACO',
    traps: 'TRAPEZIO', 'upper-back': 'DORSAL', abductors: 'GLUTEOS', adductors: 'COXA',
    cardio: 'CARDIO', 'levator-scapulae': 'TRAPEZIO', 'serratus-anterior': 'ABDOMEN', spine: 'LOMBAR',
  };

  const namePtMap: Record<string, string> = {
    'barbell bench press': 'Supino Reto com Barra',
    'dumbbell incline bench press': 'Supino Inclinado com Halteres',
    'push-up': 'Flexão de Braço',
    'cable pulldown': 'Puxada Frontal no Cabo',
    'pull-up': 'Barra Fixa Pronada',
    'barbell standing wide military press': 'Desenvolvimento Militar com Barra',
    'dumbbell lateral raise': 'Elevação Lateral com Halteres',
    'barbell curl': 'Rosca Direta com Barra',
    'dumbbell hammer curl': 'Rosca Martelo com Halteres',
    'barbell lying triceps extension': 'Tríceps Testa com Barra',
    'barbell bench squat': 'Agachamento Livre com Barra',
    'barbell straight leg deadlift': 'Stiff com Barra',
    '3-4 sit-up': 'Abdominal Supra no Solo',
  };

  let totalSeeded = 0;

  for (const mFolder of muscleFolders) {
    try {
      const res = await fetch(`${cdnBaseUrl}/api/en/muscles/${mFolder}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.exercises)) {
          for (const item of data.exercises) {
            const cleanEn = item.name.trim();
            const lowerEn = cleanEn.toLowerCase();
            const namePt = namePtMap[lowerEn] || cleanEn
              .replace(/\bBarbell\b/gi, 'com Barra')
              .replace(/\bDumbbell\b/gi, 'com Halteres')
              .replace(/\bCable\b/gi, 'no Cabo')
              .replace(/\bBand\b/gi, 'com Elástico')
              .replace(/\bBench Press\b/gi, 'Supino')
              .replace(/\bSquat\b/gi, 'Agachamento')
              .replace(/\bDeadlift\b/gi, 'Levantamento Terra')
              .replace(/\bCurl\b/gi, 'Rosca')
              .replace(/\bPushdown\b/gi, 'Extensão')
              .replace(/\bPulldown\b/gi, 'Puxada')
              .replace(/\bCrunch\b/gi, 'Abdominal');

            const fullName = `${namePt} (${cleanEn})`;
            const mGroup = muscleGroupMap[mFolder] || 'OUTROS';
            const gifUrl = `${cdnBaseUrl}/${item.file}`;
            const instructionsText = Array.isArray(item.instructions) && item.instructions.length > 0
              ? item.instructions.join(' ')
              : `Execução correta de ${namePt}. Mantenha a postura e expire na fase concêntrica.`;
            const secondaryStr = Array.isArray(item.secondaryMuscles) ? item.secondaryMuscles.join(', ') : item.secondaryMuscles || null;

            const existing = await prisma.exercise.findFirst({
              where: {
                OR: [
                  { namePt },
                  { nameEn: cleanEn },
                ],
              },
            });

            if (!existing) {
              await prisma.exercise.create({
                data: {
                  name: fullName,
                  namePt,
                  nameEn: cleanEn,
                  muscleGroup: mGroup,
                  secondaryMuscle: secondaryStr,
                  equipment: item.equipment || 'Outro',
                  metValue: 5.0,
                  gifUrl,
                  instructions: instructionsText,
                },
              });
            } else {
              await prisma.exercise.update({
                where: { id: existing.id },
                data: {
                  name: fullName,
                  namePt,
                  nameEn: cleanEn,
                  muscleGroup: mGroup,
                  gifUrl,
                  instructions: instructionsText,
                },
              });
            }
            totalSeeded++;
          }
        }
      }
    } catch (e) {
      console.warn(`Erro ao carregar muscle folder ${mFolder}:`, e);
    }
  }

  console.log(`Finalizado seed de ${totalSeeded} exercícios 3D!`);
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

