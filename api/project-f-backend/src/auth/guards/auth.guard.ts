import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SESSION_COOKIE_NAME } from '../auth.constants';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.[SESSION_COOKIE_NAME];

    if (!token) {
      throw new ForbiddenException('Missing session');
    }

    const session = await this.prisma.userSessionToken.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Invalid or expired session');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    request.user = user;
    return true;
  }
}
