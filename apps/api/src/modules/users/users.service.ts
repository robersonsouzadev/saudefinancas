import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Email em uso');
    }

    const hashedPassword = await bcrypt.hash(data.password || 'Mudar123!', 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name || data.email.split('@')[0],
        passwordHash: hashedPassword,
        phone: data.phone || null,
        whatsappPhone: data.whatsappPhone || data.phone || null,
        role: data.role || 'MEMBER',
      },
    });
  }

  async updateUser(id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const updateData: any = {
      name: data.name,
      phone: data.phone,
      whatsappPhone: data.whatsappPhone,
      role: data.role,
      isActive: data.isActive,
    };

    if (data.password) {
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

  async deleteUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
