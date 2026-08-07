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

  console.log('Seeding standard bodybuilding exercises...');
  const exercises = [
    // Peito
    { namePt: 'Supino Reto com Barra', nameEn: 'Barbell Bench Press', muscleGroup: 'PEITORAL_MEDIAL', secondaryMuscle: 'Tríceps, Deltoide Anterior', equipment: 'BARBELL', metValue: 6.0 },
    { namePt: 'Supino Inclinado com Halteres', nameEn: 'Incline Dumbbell Press', muscleGroup: 'PEITORAL_SUPERIOR', secondaryMuscle: 'Deltoide Anterior, Tríceps', equipment: 'DUMBBELL', metValue: 5.5 },
    { namePt: 'Supino Declinado com Barra', nameEn: 'Decline Barbell Press', muscleGroup: 'PEITORAL_INFERIOR', secondaryMuscle: 'Tríceps', equipment: 'BARBELL', metValue: 5.5 },
    { namePt: 'Crucifixo Reto com Halteres', nameEn: 'Flat Dumbbell Flyes', muscleGroup: 'PEITORAL_MEDIAL', secondaryMuscle: 'Deltoide Anterior', equipment: 'DUMBBELL', metValue: 5.0 },
    { namePt: 'Crossover na Polia Alta', nameEn: 'High Cable Flyes', muscleGroup: 'PEITORAL_INFERIOR', secondaryMuscle: 'Peitoral Medial', equipment: 'CABLE', metValue: 5.0 },
    { namePt: 'Crossover na Polia Baixa', nameEn: 'Low Cable Flyes', muscleGroup: 'PEITORAL_SUPERIOR', secondaryMuscle: 'Deltoide Anterior', equipment: 'CABLE', metValue: 5.0 },
    { namePt: 'Peck Deck / Voador', nameEn: 'Machine Pec Deck', muscleGroup: 'PEITORAL_MEDIAL', secondaryMuscle: 'Deltoide Anterior', equipment: 'MACHINE', metValue: 4.5 },
    { namePt: 'Flexão de Braço', nameEn: 'Push-up', muscleGroup: 'PEITORAL_MEDIAL', secondaryMuscle: 'Tríceps, Core', equipment: 'BODYWEIGHT', metValue: 5.0 },
    { namePt: 'Paralelas para Peito (Dips)', nameEn: 'Chest Dips', muscleGroup: 'PEITORAL_INFERIOR', secondaryMuscle: 'Tríceps, Deltoide Anterior', equipment: 'BODYWEIGHT', metValue: 6.0 },

    // Costas & Trapézio
    { namePt: 'Puxada Frontal Aberta', nameEn: 'Wide Lat Pulldown', muscleGroup: 'DORSAL', secondaryMuscle: 'Bíceps, Deltoide Posterior', equipment: 'CABLE', metValue: 5.0 },
    { namePt: 'Remada Curvada com Barra', nameEn: 'Bent-Over Barbell Row', muscleGroup: 'DORSAL', secondaryMuscle: 'Trapézio, Bíceps, Lombar', equipment: 'BARBELL', metValue: 6.0 },
    { namePt: 'Remada Unilateral com Halter (Serrote)', nameEn: 'Single-Arm Dumbbell Row', muscleGroup: 'DORSAL', secondaryMuscle: 'Bíceps', equipment: 'DUMBBELL', metValue: 5.5 },
    { namePt: 'Remada Baixa no Cabo (Triângulo)', nameEn: 'Seated Cable Row', muscleGroup: 'DORSAL', secondaryMuscle: 'Trapézio, Bíceps', equipment: 'CABLE', metValue: 5.0 },
    { namePt: 'Barra Fixa Pronada', nameEn: 'Pull-up', muscleGroup: 'DORSAL', secondaryMuscle: 'Bíceps, Core', equipment: 'BODYWEIGHT', metValue: 6.0 },
    { namePt: 'Pulldown com Corda na Polia', nameEn: 'Cable Rope Pulldown', muscleGroup: 'DORSAL', secondaryMuscle: 'Tríceps (cabeça longa)', equipment: 'CABLE', metValue: 4.5 },
    { namePt: 'Levantamento Terra', nameEn: 'Deadlift', muscleGroup: 'LOMBAR', secondaryMuscle: 'Glúteos, Quadríceps, Trapézio', equipment: 'BARBELL', metValue: 7.0 },
    { namePt: 'Encolhimento com Halteres', nameEn: 'Dumbbell Shrugs', muscleGroup: 'TRAPEZIO', secondaryMuscle: 'Antebraço', equipment: 'DUMBBELL', metValue: 4.5 },
    { namePt: 'Encolhimento com Barra', nameEn: 'Barbell Shrugs', muscleGroup: 'TRAPEZIO', secondaryMuscle: 'Antebraço', equipment: 'BARBELL', metValue: 5.0 },

    // Ombros
    { namePt: 'Desenvolvimento Militar com Barra', nameEn: 'Overhead Military Press', muscleGroup: 'OMBRO_ANTERIOR', secondaryMuscle: 'Deltoide Lateral, Tríceps', equipment: 'BARBELL', metValue: 6.0 },
    { namePt: 'Desenvolvimento com Halteres Sentado', nameEn: 'Seated Dumbbell Shoulder Press', muscleGroup: 'OMBRO_ANTERIOR', secondaryMuscle: 'Tríceps', equipment: 'DUMBBELL', metValue: 5.5 },
    { namePt: 'Elevação Lateral com Halteres', nameEn: 'Dumbbell Lateral Raise', muscleGroup: 'OMBRO_LATERAL', secondaryMuscle: 'Trapézio', equipment: 'DUMBBELL', metValue: 4.5 },
    { namePt: 'Elevação Lateral na Polia', nameEn: 'Cable Lateral Raise', muscleGroup: 'OMBRO_LATERAL', secondaryMuscle: 'Trapézio', equipment: 'CABLE', metValue: 4.5 },
    { namePt: 'Elevação Frontal com Halteres', nameEn: 'Dumbbell Front Raise', muscleGroup: 'OMBRO_ANTERIOR', secondaryMuscle: 'Peitoral Superior', equipment: 'DUMBBELL', metValue: 4.5 },
    { namePt: 'Crucifixo Inverso no Peck Deck', nameEn: 'Reverse Pec Deck Fly', muscleGroup: 'OMBRO_POSTERIOR', secondaryMuscle: 'Trapézio, Romboides', equipment: 'MACHINE', metValue: 4.5 },
    { namePt: 'Face Pull na Polia', nameEn: 'Cable Face Pull', muscleGroup: 'OMBRO_POSTERIOR', secondaryMuscle: 'Trapézio, Manguito Rotador', equipment: 'CABLE', metValue: 4.5 },

    // Bíceps & Antebraço
    { namePt: 'Rosca Direta com Barra W', nameEn: 'EZ-Bar Biceps Curl', muscleGroup: 'BICEPS', secondaryMuscle: 'Antebraço', equipment: 'BARBELL', metValue: 4.5 },
    { namePt: 'Rosca Alternada com Halteres', nameEn: 'Alternating Dumbbell Curl', muscleGroup: 'BICEPS', secondaryMuscle: 'Antebraço', equipment: 'DUMBBELL', metValue: 4.5 },
    { namePt: 'Rosca Martelo', nameEn: 'Dumbbell Hammer Curl', muscleGroup: 'BICEPS', secondaryMuscle: 'Braquiorradial, Antebraço', equipment: 'DUMBBELL', metValue: 4.5 },
    { namePt: 'Rosca Scott com Barra EZ', nameEn: 'Preacher Curl', muscleGroup: 'BICEPS', secondaryMuscle: 'Antebraço', equipment: 'BARBELL', metValue: 4.5 },
    { namePt: 'Rosca Concentrada', nameEn: 'Concentration Curl', muscleGroup: 'BICEPS', secondaryMuscle: 'Braquial', equipment: 'DUMBBELL', metValue: 4.0 },
    { namePt: 'Rosca Inversa', nameEn: 'Reverse Barbell Curl', muscleGroup: 'ANTEBRACO', secondaryMuscle: 'Bíceps', equipment: 'BARBELL', metValue: 4.0 },

    // Tríceps
    { namePt: 'Tríceps Pulley na Corda', nameEn: 'Rope Pushdown', muscleGroup: 'TRICEPS', secondaryMuscle: 'Antebraço', equipment: 'CABLE', metValue: 4.5 },
    { namePt: 'Tríceps Pulley com Barra Reta', nameEn: 'Straight Bar Pushdown', muscleGroup: 'TRICEPS', secondaryMuscle: 'Antebraço', equipment: 'CABLE', metValue: 4.5 },
    { namePt: 'Tríceps Testa com Barra W', nameEn: 'Skullcrushers / Lying Triceps Extension', muscleGroup: 'TRICEPS', secondaryMuscle: 'Antebraço', equipment: 'BARBELL', metValue: 5.0 },
    { namePt: 'Tríceps Francês com Halter', nameEn: 'Overhead Dumbbell Extension', muscleGroup: 'TRICEPS', secondaryMuscle: 'Core', equipment: 'DUMBBELL', metValue: 4.5 },
    { namePt: 'Tríceps Coice no Cabo', nameEn: 'Cable Kickback', muscleGroup: 'TRICEPS', secondaryMuscle: 'Antebraço', equipment: 'CABLE', metValue: 4.0 },

    // Pernas & Glúteos
    { namePt: 'Agachamento Livre com Barra', nameEn: 'Barbell Back Squat', muscleGroup: 'QUADRICEPS', secondaryMuscle: 'Glúteos, Isquiotibiais, Lombar', equipment: 'BARBELL', metValue: 7.0 },
    { namePt: 'Leg Press 45°', nameEn: '45° Leg Press', muscleGroup: 'QUADRICEPS', secondaryMuscle: 'Glúteos', equipment: 'MACHINE', metValue: 6.0 },
    { namePt: 'Cadeira Extensora', nameEn: 'Leg Extension Machine', muscleGroup: 'QUADRICEPS', secondaryMuscle: 'Nenhum', equipment: 'MACHINE', metValue: 4.5 },
    { namePt: 'Agachamento Búlgaro com Halteres', nameEn: 'Bulgarian Split Squat', muscleGroup: 'QUADRICEPS', secondaryMuscle: 'Glúteos', equipment: 'DUMBBELL', metValue: 6.5 },
    { namePt: 'Hack Squat na Máquina', nameEn: 'Hack Squat Machine', muscleGroup: 'QUADRICEPS', secondaryMuscle: 'Glúteos', equipment: 'MACHINE', metValue: 6.0 },
    { namePt: 'Mesa Flexora', nameEn: 'Lying Leg Curl', muscleGroup: 'POSTERIOR_COXA', secondaryMuscle: 'Panturrilha', equipment: 'MACHINE', metValue: 4.5 },
    { namePt: 'Cadeira Flexora', nameEn: 'Seated Leg Curl', muscleGroup: 'POSTERIOR_COXA', secondaryMuscle: 'Panturrilha', equipment: 'MACHINE', metValue: 4.5 },
    { namePt: 'Stiff com Barra', nameEn: 'Barbell Stiff Leg Deadlift', muscleGroup: 'POSTERIOR_COXA', secondaryMuscle: 'Glúteos, Lombar', equipment: 'BARBELL', metValue: 6.0 },
    { namePt: 'Elevação Pélvica com Barra (Hip Thrust)', nameEn: 'Barbell Hip Thrust', muscleGroup: 'GLUTEOS', secondaryMuscle: 'Isquiotibiais', equipment: 'BARBELL', metValue: 6.0 },
    { namePt: 'Cadeira Abdutora', nameEn: 'Abductor Machine', muscleGroup: 'GLUTEOS', secondaryMuscle: 'Glúteo Médio', equipment: 'MACHINE', metValue: 4.0 },
    { namePt: 'Panturrilha em Pé na Máquina', nameEn: 'Standing Calf Raise', muscleGroup: 'PANTURRILHA', secondaryMuscle: 'Sóleo', equipment: 'MACHINE', metValue: 4.0 },
    { namePt: 'Panturrilha Sentado (Gêmeos)', nameEn: 'Seated Calf Raise', muscleGroup: 'PANTURRILHA', secondaryMuscle: 'Gastrocnêmio', equipment: 'MACHINE', metValue: 4.0 },

    // Abdômen & Cardio
    { namePt: 'Abdominal Supra no Solo', nameEn: 'Abdominal Crunch', muscleGroup: 'ABDOMEN', secondaryMuscle: 'Nenhum', equipment: 'BODYWEIGHT', metValue: 4.0 },
    { namePt: 'Prancha Abdominal Isométrica', nameEn: 'Plank', muscleGroup: 'ABDOMEN', secondaryMuscle: 'Ombros, Glúteos', equipment: 'BODYWEIGHT', metValue: 4.5 },
    { namePt: 'Elevação de Pernas na Barra Fixa', nameEn: 'Hanging Leg Raise', muscleGroup: 'ABDOMEN', secondaryMuscle: 'Flexores do Quadril', equipment: 'BODYWEIGHT', metValue: 5.0 },
    { namePt: 'Abdominal Infra no Banco Inclinado', nameEn: 'Incline Leg Raise', muscleGroup: 'ABDOMEN', secondaryMuscle: 'Flexores do Quadril', equipment: 'BODYWEIGHT', metValue: 4.5 },
    { namePt: 'Corrida na Esteira', nameEn: 'Treadmill Running', muscleGroup: 'CARDIO', secondaryMuscle: 'Pernas', equipment: 'MACHINE', metValue: 8.0 },
    { namePt: 'Bicicleta Ergométrica', nameEn: 'Stationary Bike', muscleGroup: 'CARDIO', secondaryMuscle: 'Quadríceps', equipment: 'MACHINE', metValue: 7.0 }
  ];

  for (const ex of exercises) {
    const fullName = `${ex.namePt} (${ex.nameEn})`;
    const existing = await prisma.exercise.findFirst({ where: { namePt: ex.namePt } });
    if (!existing) {
      await prisma.exercise.create({
        data: {
          name: fullName,
          namePt: ex.namePt,
          nameEn: ex.nameEn,
          muscleGroup: ex.muscleGroup,
          secondaryMuscle: ex.secondaryMuscle,
          equipment: ex.equipment,
          metValue: ex.metValue,
          instructions: `Execução correta de ${ex.namePt}. Mantenha a postura e expire na fase concêntrica.`,
        }
      });
    }
  }
  console.log(`Seeded ${exercises.length} standard bodybuilding exercises.`);

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

