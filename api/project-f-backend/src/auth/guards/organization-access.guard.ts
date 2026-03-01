import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const activeOrganizationId = request.authContext?.activeOrganizationId as
      | string
      | null
      | undefined;

    if (!activeOrganizationId) {
      throw new ConflictException('No active organization selected');
    }

    return true;
  }
}
