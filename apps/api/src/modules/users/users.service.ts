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

    const cleanPhone = (val?: string) => (val && typeof val === 'string' && val.trim() !== '' ? val.trim() : null);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name ? data.name.trim() : null;
    if (data.phone !== undefined) updateData.phone = cleanPhone(data.phone);
    if (data.whatsappPhone !== undefined) updateData.whatsappPhone = cleanPhone(data.whatsappPhone);
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }
    if (data.biologicalSex !== undefined) {
      updateData.biologicalSex = data.biologicalSex || null;
    }
    if (data.heightCm !== undefined) {
      updateData.heightCm = data.heightCm ? parseFloat(data.heightCm) : null;
    }
    if (data.uazapiInstance !== undefined) {
      updateData.uazapiInstance = data.uazapiInstance ? data.uazapiInstance.trim() : null;
    }
    if (data.uazapiToken !== undefined) {
      updateData.uazapiToken = data.uazapiToken ? data.uazapiToken.trim() : null;
    }

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
        birthDate: true,
        biologicalSex: true,
        heightCm: true,
        uazapiInstance: true,
        uazapiToken: true,
      },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
