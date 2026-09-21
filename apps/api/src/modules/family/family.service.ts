import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  async createGroup(creatorUserId: string, data: { name: string; description?: string; memberIds?: string[] }) {
    const creator = await this.prisma.user.findUnique({ where: { id: creatorUserId } });
    if (!creator || creator.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas Administradores do sistema podem criar grupos familiares');
    }

    const group = await this.prisma.familyGroup.create({
      data: {
        name: data.name,
        description: data.description || null,
        members: {
          create: {
            userId: creatorUserId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, whatsappPhone: true, role: true },
            },
          },
        },
      },
    });

    if (data.memberIds && data.memberIds.length > 0) {
      for (const mId of data.memberIds) {
        if (mId !== creatorUserId) {
          await this.prisma.familyMember.upsert({
            where: { userId_groupId: { userId: mId, groupId: group.id } },
            create: { userId: mId, groupId: group.id, role: 'MEMBER' },
            update: {},
          });
        }
      }
    }

    return this.getGroupDetails(group.id, creatorUserId);
  }

  async getUserGroups(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, whatsappPhone: true, role: true },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map(m => ({
      ...m.group,
      currentUserRole: m.role,
    }));
  }

  async getGroupDetails(groupId: string, userId: string) {
    const group = await this.prisma.familyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, whatsappPhone: true, role: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo familiar não encontrado');
    }

    const membership = group.members.find(m => m.userId === userId);
    if (!membership) {
      throw new ForbiddenException('Você não pertence a este grupo familiar');
    }

    return {
      ...group,
      currentUserRole: membership.role,
    };
  }

  async getOrCreateDefaultGroup(userId: string) {
    const userGroups = await this.getUserGroups(userId);
    if (userGroups && userGroups.length > 0) {
      return this.getGroupDetails(userGroups[0].id, userId);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Se for ADMIN, cria o grupo default. Se for MEMBER, procura um grupo criado pelo ADMIN
    if (user.role === 'ADMIN') {
      return this.createGroup(userId, { name: 'Grupo Familiar' });
    } else {
      const adminGroup = await this.prisma.familyGroup.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (adminGroup) {
        await this.addMember(adminGroup.id, userId, 'MEMBER');
        return this.getGroupDetails(adminGroup.id, userId);
      } else {
        // Criar grupo
        const group = await this.prisma.familyGroup.create({
          data: {
            name: 'Grupo Familiar',
            members: {
              create: { userId, role: 'MEMBER' },
            },
          },
        });
        return this.getGroupDetails(group.id, userId);
      }
    }
  }

  async addMemberByEmail(groupId: string, email: string, name?: string, whatsappPhone?: string) {
    const cleanEmail = email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });

    const cleanPhoneStr = whatsappPhone ? whatsappPhone.replace(/\D/g, '') : null;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: cleanEmail,
          name: name ? name.trim() : cleanEmail.split('@')[0],
          whatsappPhone: cleanPhoneStr,
          role: 'MEMBER',
          isActive: true,
        },
      });
    } else {
      // Atualizar nome ou whatsapp se fornecido e estiver ausente
      const updateData: any = {};
      if (name && !user.name) updateData.name = name.trim();
      if (cleanPhoneStr && !user.whatsappPhone) updateData.whatsappPhone = cleanPhoneStr;
      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    await this.prisma.familyMember.upsert({
      where: { userId_groupId: { userId: user.id, groupId } },
      create: { userId: user.id, groupId, role: 'MEMBER' },
      update: { role: 'MEMBER' },
    });

    return this.prisma.familyMember.findUnique({
      where: { userId_groupId: { userId: user.id, groupId } },
      include: {
        user: { select: { id: true, name: true, email: true, whatsappPhone: true, role: true } },
      },
    });
  }

  async addMember(groupId: string, targetUserId: string, role: string = 'MEMBER') {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('Usuário a ser adicionado não foi encontrado');
    }

    return this.prisma.familyMember.upsert({
      where: { userId_groupId: { userId: targetUserId, groupId } },
      create: { userId: targetUserId, groupId, role },
      update: { role },
    });
  }

  async removeMember(groupId: string, targetUserId: string) {
    return this.prisma.familyMember.delete({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
  }
}
