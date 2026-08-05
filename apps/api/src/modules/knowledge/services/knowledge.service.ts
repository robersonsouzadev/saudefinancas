import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { TextSplitterService } from './text-splitter.service';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
    private splitter: TextSplitterService,
  ) {}

  /**
   * Uploads and vectorizes a document into knowledge_documents and knowledge_chunks
   */
  async uploadDocument(data: {
    agentId?: string;
    title: string;
    fileType?: string;
    content: string;
  }) {
    // 1. Get or find default Agent if agentId is not specified
    let agentId = data.agentId;
    if (!agentId) {
      const defaultAgent = await this.prisma.agent.findFirst();
      if (defaultAgent) {
        agentId = defaultAgent.id;
      } else {
        const newAgent = await this.prisma.agent.create({
          data: {
            name: 'Vita — Assistente de Bem-Estar',
            systemPrompt: 'Você é a assistente pessoal Vita.',
          }
        });
        agentId = newAgent.id;
      }
    }

    // 2. Chunk text
    const chunksText = this.splitter.splitText(data.content, 1000, 200);
    this.logger.log(`Processing '${data.title}': ${chunksText.length} chunks generated.`);

    // 3. Create KnowledgeDocument record
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        agentId,
        title: data.title,
        fileType: data.fileType || 'PDF',
        totalChunks: chunksText.length,
      },
    });

    // 4. Generate embeddings for all chunks
    const embeddings = await this.embeddingService.createEmbeddings(chunksText);

    // 5. Store chunks
    for (let i = 0; i < chunksText.length; i++) {
      const chunkText = chunksText[i];
      const vector = embeddings[i];

      try {
        const vectorStr = `[${vector.join(',')}]`;
        await this.prisma.$executeRaw`
          INSERT INTO "knowledge_chunks" ("id", "documentId", "content", "chunkIndex", "embedding", "createdAt")
          VALUES (gen_random_uuid(), ${doc.id}, ${chunkText}, ${i}, ${vectorStr}::vector, NOW())
        `;
      } catch (err: any) {
        // Fallback for Prisma/SQL without raw vector syntax
        await this.prisma.knowledgeChunk.create({
          data: {
            documentId: doc.id,
            content: chunkText,
            chunkIndex: i,
          }
        });
      }
    }

    return {
      documentId: doc.id,
      title: doc.title,
      totalChunks: chunksText.length,
      status: 'INDEXED'
    };
  }

  /**
   * Retrieves all index documents
   */
  async getDocuments() {
    const docs = await this.prisma.knowledgeDocument.findMany({
      include: {
        agent: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return docs.map(d => ({
      id: d.id,
      title: d.title,
      agentName: d.agent?.name || 'Agente Vita',
      fileType: d.fileType,
      totalChunks: d.totalChunks,
      createdAt: d.createdAt.toLocaleDateString('pt-BR')
    }));
  }

  /**
   * Deletes a document and its vector chunks
   */
  async deleteDocument(id: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado');

    await this.prisma.knowledgeDocument.delete({ where: { id } });
    return { success: true, message: 'Documento excluído com sucesso' };
  }

  /**
   * Performs vector similarity search for RAG
   */
  async searchSimilar(query: string, agentId?: string, limit = 5) {
    const queryVector = await this.embeddingService.createEmbedding(query);
    const vectorStr = `[${queryVector.join(',')}]`;

    try {
      const results: any[] = await this.prisma.$queryRaw`
        SELECT kc."id", kc."content", kd."title", (kc."embedding" <-> ${vectorStr}::vector) as distance
        FROM "knowledge_chunks" kc
        JOIN "knowledge_documents" kd ON kc."documentId" = kd."id"
        ORDER BY distance ASC
        LIMIT ${limit}
      `;
      return results;
    } catch (err) {
      // Fallback text search if pgvector extension is not enabled in DB query
      const chunks = await this.prisma.knowledgeChunk.findMany({
        where: { content: { contains: query, mode: 'insensitive' } },
        take: limit,
      });
      return chunks;
    }
  }
}
