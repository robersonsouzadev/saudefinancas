import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        whatsappPhone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        familyMemberships: {
          include: {
            group: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        whatsappPhone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        familyMemberships: {
          include: {
            group: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async createUser(data: any) {
    const email = data.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email é obrigatório');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email em uso');
    }

    const cleanPhone = (val?: string) => (val && typeof val === 'string' && val.trim() !== '' ? val.trim() : null);
    const phone = cleanPhone(data.phone);
    const whatsappPhone = cleanPhone(data.whatsappPhone) || phone;

    const hashedPassword = await bcrypt.hash(data.password || 'Mudar123!', 10);
    return this.prisma.user.create({
      data: {
        email,
        name: data.name ? data.name.trim() : email.split('@')[0],
        passwordHash: hashedPassword,
        phone,
        whatsappPhone,
        role: data.role || 'MEMBER',
      },
    });
  }

  async updateUser(id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const cleanPhone = (val?: string) => (val && typeof val === 'string' && val.trim() !== '' ? val.trim() : null);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name ? data.name.trim() : null;
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
    if (data.phone !== undefined) updateData.phone = cleanPhone(data.phone);
    if (data.whatsappPhone !== undefined) updateData.whatsappPhone = cleanPhone(data.whatsappPhone);
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.password && typeof data.password === 'string' && data.password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        whatsappPhone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
      },
    });
  }

  async updateProfile(id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const cleanPhone = (val?: string) => {
      if (!val || typeof val !== 'string' || val.trim() === '') return null;
      const digits = val.replace(/\D/g, '');
      return digits ? digits : null;
    };

    const parseBirthDate = (val: any): Date | null => {
      if (!val) return null;
      if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return null;

        // Formato BR: DD/MM/YYYY ou DD-MM-YYYY
        const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (brMatch) {
          const day = parseInt(brMatch[1], 10);
          const month = parseInt(brMatch[2], 10) - 1;
          const year = parseInt(brMatch[3], 10);
          const d = new Date(Date.UTC(year, month, day));
          return isNaN(d.getTime()) ? null : d;
        }

        // Formato ISO: YYYY-MM-DD
        const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (isoMatch) {
          const year = parseInt(isoMatch[1], 10);
          const month = parseInt(isoMatch[2], 10) - 1;
          const day = parseInt(isoMatch[3], 10);
          const d = new Date(Date.UTC(year, month, day));
          return isNaN(d.getTime()) ? null : d;
        }

        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name ? data.name.trim() : null;
    if (data.phone !== undefined) updateData.phone = cleanPhone(data.phone);
    if (data.whatsappPhone !== undefined) updateData.whatsappPhone = cleanPhone(data.whatsappPhone);
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    if (data.birthDate !== undefined) {
      updateData.birthDate = parseBirthDate(data.birthDate);
    }

    if (data.biologicalSex !== undefined) {
      const sex = (data.biologicalSex || '').toString().toUpperCase();
      if (sex === 'MASCULINO' || sex === 'FEMININO') {
        updateData.biologicalSex = sex;
      } else {
        updateData.biologicalSex = null;
      }
    }

    if (data.heightCm !== undefined) {
      const h = parseFloat(data.heightCm);
      updateData.heightCm = !isNaN(h) && h > 0 ? h : null;
    }

    if (data.uazapiInstance !== undefined) {
      updateData.uazapiInstance = data.uazapiInstance ? data.uazapiInstance.trim() : null;
    }
    if (data.uazapiToken !== undefined) {
      updateData.uazapiToken = data.uazapiToken ? data.uazapiToken.trim() : null;
    }
    if (data.timezone !== undefined) {
      updateData.timezone = data.timezone ? data.timezone.trim() : 'America/Sao_Paulo';
    }

    if (data.password && typeof data.password === 'string' && data.password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Se whatsappPhone for fornecido, verificar se pertence a outro usuário para dar mensagem amigável
    if (updateData.whatsappPhone) {
      const otherUser = await this.prisma.user.findFirst({
        where: {
          whatsappPhone: updateData.whatsappPhone,
          id: { not: id },
        },
      });
      if (otherUser) {
        throw new ConflictException('Este número de WhatsApp já está associado a outro perfil de usuário.');
      }
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          whatsappPhone: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          birthDate: true,
          biologicalSex: true,
          heightCm: true,
          uazapiInstance: true,
          uazapiToken: true,
          timezone: true,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Erro de dados duplicados. Verifique o número de WhatsApp ou e-mail.');
      }
      throw new BadRequestException(`Erro ao atualizar perfil: ${err.message || 'Dados inválidos'}`);
    }
  }

  async deleteUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
