import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = (req.headers['x-tenant-id'] ||
      req.headers['tenant-id']) as string;
    if (!tenantId) {
      throw new BadRequestException('Missing tenant ID in header: x-tenant-id');
    }
    // attach to request for downstream use
    (req as any).tenantId = tenantId;
    next();
  }
}
