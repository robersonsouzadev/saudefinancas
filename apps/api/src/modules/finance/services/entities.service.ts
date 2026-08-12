import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EntityType } from '@prisma/client';

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getEntities(userId: string, type?: EntityType) {
    const where: any = { userId };
    if (type) where.type = type;

    return this.prisma.financialEntity.findMany({
      where,
      include: {
        _count: {
          select: { titles: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createEntity(userId: string, dto: {
    type: EntityType;
    name: string;
    document?: string;
    email?: string;
    phone?: string;
    notes?: string;
  }) {
    if (!dto.name || !dto.type) {
      throw new BadRequestException('Nome e tipo (SUPPLIER/CLIENT) são obrigatórios.');
    }

    return this.prisma.financialEntity.create({
      data: {
        userId,
        type: dto.type,
        name: dto.name,
        document: dto.document,
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes,
      },
    });
  }

  async updateEntity(userId: string, id: string, dto: any) {
    const entity = await this.prisma.financialEntity.findFirst({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Entidade não encontrada.');

    return this.prisma.financialEntity.update({
      where: { id },
      data: {
        name: dto.name ?? entity.name,
        type: dto.type ?? entity.type,
        document: dto.document ?? entity.document,
        email: dto.email ?? entity.email,
        phone: dto.phone ?? entity.phone,
        notes: dto.notes ?? entity.notes,
      },
    });
  }

  async deleteEntity(userId: string, id: string) {
    const entity = await this.prisma.financialEntity.findFirst({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Entidade não encontrada.');

    return this.prisma.financialEntity.delete({ where: { id } });
  }

  async getEntityStatement(userId: string, id: string) {
    const entity = await this.prisma.financialEntity.findFirst({
      where: { id, userId },
      include: {
        titles: {
          include: {
            category: true,
            payments: true,
          },
          orderBy: { dueDate: 'desc' },
        },
      },
    });

    if (!entity) throw new NotFoundException('Entidade não encontrada.');

    const totalTitles = entity.titles.length;
    const totalOriginalAmount = entity.titles.reduce((acc, t) => acc + t.originalAmount, 0);
    const totalPaidAmount = entity.titles.reduce((acc, t) => acc + t.paidAmount, 0);
    const totalPendingAmount = totalOriginalAmount - totalPaidAmount;

    return {
      entity,
      summary: {
        totalTitles,
        totalOriginalAmount,
        totalPaidAmount,
        totalPendingAmount,
      },
    };
  }

  /**
   * Consulta pública de CNPJ na Receita Federal via BrasilAPI com fallback para ReceitaWS
   */
  async lookupCNPJ(cnpj: string) {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new BadRequestException('CNPJ deve conter exatamente 14 dígitos.');
    }

    // 1. Tenta BrasilAPI
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: { 'User-Agent': 'SaudeFinancas/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        const phone = data.ddd_telefone_1
          ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}`
          : null;
        const address = [
          data.logradouro,
          data.numero ? `nº ${data.numero}` : null,
          data.complemento,
          data.bairro,
          data.municipio ? `${data.municipio}/${data.uf}` : null,
          data.cep ? `CEP ${data.cep}` : null,
        ].filter(Boolean).join(', ');

        return {
          cnpj: cleanCnpj,
          formattedCnpj: cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
          name: data.razao_social || data.nome_fantasia,
          tradeName: data.nome_fantasia || data.razao_social,
          email: data.email || null,
          phone,
          status: data.descricao_situacao_cadastral || 'ATIVA',
          address,
          legalNature: data.natureza_juridica || null,
          source: 'BrasilAPI',
        };
      }
    } catch (err) {
      console.warn('BrasilAPI falhou, tentando ReceitaWS...', err);
    }

    // 2. Fallback para ReceitaWS
    try {
      const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCnpj}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ERROR') {
          throw new BadRequestException(data.message || 'CNPJ não encontrado na Receita Federal.');
        }
        return {
          cnpj: cleanCnpj,
          formattedCnpj: cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
          name: data.nome || data.fantasia,
          tradeName: data.fantasia || data.nome,
          email: data.email || null,
          phone: data.telefone || null,
          status: data.situacao || 'ATIVA',
          address: `${data.logradouro || ''}, ${data.numero || ''} - ${data.bairro || ''}, ${data.municipio || ''}/${data.uf || ''}`,
          source: 'ReceitaWS',
        };
      }
    } catch (err) {
      console.error('ReceitaWS também falhou:', err);
    }

    throw new BadRequestException('Não foi possível consultar os dados do CNPJ na Receita Federal. Verifique o número digitado.');
  }
}

