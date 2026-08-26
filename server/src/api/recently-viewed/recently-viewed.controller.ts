import { Request, Response } from 'express';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { RecentlyViewedService } from './recently-viewed.service';

export class RecentlyViewedController {
    static async list(req: Request, res: Response) {
        const limit = Number((req.query as any).limit ?? 12);
        const items = await RecentlyViewedService.list(req.params.user_id, limit);
        res.status(HttpStatusCode.OK).json({ items });
    }

    static async record(req: Request, res: Response) {
        await RecentlyViewedService.record(req.params.user_id, req.body.product_id);
        res.status(HttpStatusCode.NO_CONTENT).send();
    }
}
