import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.id || !user.tenantId || !user.isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }
    
    return true;
  }
}