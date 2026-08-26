import { Request, Response } from 'express';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { NotificationService } from './notifications-inbox.service';

export class NotificationController {
    static async list(req: Request, res: Response) {
        const limit = Number((req.query as any).limit ?? 20);
        const offset = Number((req.query as any).offset ?? 0);
        const unread_only = (req.query as any).unread_only === true || (req.query as any).unread_only === 'true';
        const result = await NotificationService.list(req.params.user_id, { limit, offset, unread_only });
        res.status(HttpStatusCode.OK).json(result);
    }

    static async markRead(req: Request, res: Response) {
        await NotificationService.markRead(req.params.notification_id, req.params.user_id);
        res.status(HttpStatusCode.OK).json({ message: 'Marked as read' });
    }

    static async markAllRead(req: Request, res: Response) {
        await NotificationService.markAllRead(req.params.user_id);
        res.status(HttpStatusCode.OK).json({ message: 'All notifications marked as read' });
    }

    static async delete(req: Request, res: Response) {
        await NotificationService.delete(req.params.notification_id, req.params.user_id);
        res.status(HttpStatusCode.NO_CONTENT).send();
    }
}
