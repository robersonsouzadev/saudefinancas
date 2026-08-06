import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: any) {
    const email = data.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email é obrigatório');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email em uso');
    }

    const count = await this.prisma.user.count();
    const role = count === 0 ? 'ADMIN' : (data.role || 'MEMBER');

    const cleanPhone = (val?: string) => (val && typeof val === 'string' && val.trim() !== '' ? val.trim() : null);
    const phone = cleanPhone(data.phone);
    const whatsappPhone = cleanPhone(data.whatsappPhone) || phone;

    const hashedPassword = await bcrypt.hash(data.password || 'Mudar123!', 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: data.name ? data.name.trim() : email.split('@')[0],
        passwordHash: hashedPassword,
        phone,
        whatsappPhone,
        role,
      },
    });

    return this.generateToken(user);
  }

  async login(data: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas ou usuário inativo');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('Esta conta utiliza login pelo Google. Por favor, entre com sua conta Google.');
    }
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.generateToken(user);
  }

  async validateOrCreateGoogleUser(profile: any) {
    const { id, emails, displayName, photos } = profile;
    const email = emails && emails[0] ? emails[0].value.toLowerCase() : null;

    if (!email) {
      throw new BadRequestException('Email não fornecido pela conta Google');
    }

    // 1. Check if user exists by googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId: id },
    });

    if (user) {
      return this.generateToken(user);
    }

    // 2. Check if user exists by email (account linking)
    user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Link googleId to existing local user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: id,
          authProvider: 'GOOGLE',
          avatarUrl: user.avatarUrl || (photos && photos[0] ? photos[0].value : null),
        },
      });
      return this.generateToken(user);
    }

    // 3. Create new user for Google login
    const count = await this.prisma.user.count();
    const role = count === 0 ? 'ADMIN' : 'MEMBER';
    const avatarUrl = photos && photos[0] ? photos[0].value : null;

    user = await this.prisma.user.create({
      data: {
        email,
        name: displayName || email.split('@')[0],
        googleId: id,
        authProvider: 'GOOGLE',
        avatarUrl,
        role,
      },
    });

    return this.generateToken(user);
  }

  async forgotPassword(email: string, channel: 'email' | 'whatsapp' = 'whatsapp') {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        code,
        channel,
        expiresAt,
      },
    });

    const destination = channel === 'whatsapp' ? (user.whatsappPhone || user.phone || user.email) : user.email;

    return {
      success: true,
      message: `Código de redefinição enviado via ${channel.toUpperCase()} para ${destination}`,
      code, // Returned for dev testing UI
    };
  }

  async resetPassword(data: { email: string; code: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const resetEntry = await this.prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        code: data.code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetEntry) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    await this.prisma.passwordResetCode.update({
      where: { id: resetEntry.id },
      data: { usedAt: new Date() },
    });

    return {
      success: true,
      message: 'Senha redefinida com sucesso!',
    };
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        whatsappPhone: user.whatsappPhone,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
