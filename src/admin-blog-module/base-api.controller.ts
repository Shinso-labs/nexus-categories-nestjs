import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';

@Injectable()
export class BaseApiController {
  protected isV2Api = true;

  /**
   * Require admin authentication
   * Source: BaseApiController.requireAdmin
   */
  requireAdmin(req?: any): number {
    if (!req || !req.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = req.user;
    if (!user.isAdmin && user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return user.id;
  }

  /**
   * Get tenant ID from request
   * Source: BaseApiController.getTenantId
   */
  getTenantId(req?: any): number {
    if (!req || !req.tenant) {
      throw new BadRequestException('Tenant context required');
    }

    return req.tenant.id;
  }

  /**
   * Get query parameter as integer with validation
   * Source: BaseApiController.queryInt
   */
  queryInt(req: any, key: string, defaultValue: number, min?: number, max?: number): number {
    const value = req?.query?.[key];
    if (value === undefined || value === null) {
      return defaultValue;
    }

    const parsed = parseInt(String(value));
    if (isNaN(parsed)) {
      return defaultValue;
    }

    if (min !== undefined && parsed < min) {
      return min;
    }

    if (max !== undefined && parsed > max) {
      return max;
    }

    return parsed;
  }

  /**
   * Get query parameter
   * Source: BaseApiController.query
   */
  query(req: any, key: string, defaultValue?: any): any {
    return req?.query?.[key] ?? defaultValue;
  }

  /**
   * Get input parameter
   * Source: BaseApiController.input
   */
  input(req: any, key: string, defaultValue?: any): any {
    return req?.body?.[key] ?? defaultValue;
  }

  /**
   * Get all input parameters
   * Source: BaseApiController.getAllInput
   */
  getAllInput(req: any): Record<string, any> {
    return req?.body || {};
  }

  /**
   * Rate limiting implementation
   * Source: BaseApiController.rateLimit
   */
  rateLimit(req: any, key: string, maxAttempts: number, windowSeconds: number): void {
    // Implementation would use Redis or in-memory store
    // For now, this is a placeholder that could throw TooManyRequestsException
    const identifier = `${req?.ip || 'unknown'}_${key}`;
    // Rate limiting logic would be implemented here
  }

  /**
   * Respond with paginated collection
   * Source: BaseApiController.respondWithPaginatedCollection
   */
  respondWithPaginatedCollection(data: any[], total: number, page: number, limit: number): any {
    return {
      success: true,
      data,
      meta: {
        total,
        page,
        perPage: limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Respond with data
   * Source: BaseApiController.respondWithData
   */
  respondWithData(data: any, message?: string, statusCode?: number): any {
    return {
      success: true,
      data,
      message: message || null,
    };
  }

  /**
   * Respond with error
   * Source: BaseApiController.respondWithError
   */
  respondWithError(code: string, message: string, field?: string, statusCode?: number): any {
    const error = {
      success: false,
      error: {
        code,
        message,
        field: field || null,
      },
    };

    // In a real implementation, this would throw an appropriate HTTP exception
    // based on the statusCode parameter
    if (statusCode === 400) {
      throw new BadRequestException(error);
    }
    if (statusCode === 401) {
      throw new UnauthorizedException(error);
    }
    if (statusCode === 403) {
      throw new ForbiddenException(error);
    }
    if (statusCode === 404) {
      throw new NotFoundException(error);
    }

    throw new BadRequestException(error);
  }
}