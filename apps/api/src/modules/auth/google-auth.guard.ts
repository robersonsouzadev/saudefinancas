import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const res = context.switchToHttp().getResponse();
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.robersonsouza.com.br';

    if (err || !user) {
      const message = err?.message || 'Acesso restrito. Seu e-mail não possui autorização.';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
      return null;
    }
    return user;
  }
}
