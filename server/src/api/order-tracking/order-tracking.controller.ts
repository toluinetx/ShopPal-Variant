import { Request, Response } from 'express';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { OrderTrackingService } from './order-tracking.service';

export class OrderTrackingController {
    static async list(req: Request, res: Response) {
        const events = await OrderTrackingService.listForOrder(req.params.order_id);
        res.status(HttpStatusCode.OK).json({ events });
    }

    // Admin-only: push a new tracking event onto the order timeline.
    static async addEvent(req: Request, res: Response) {
        const event = await OrderTrackingService.addEvent({
            order_id: req.params.order_id,
            status: req.body.status,
            location: req.body.location,
            message: req.body.message,
        });
        res.status(HttpStatusCode.CREATED).json({ event });
    }
}
