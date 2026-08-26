import { Request, Response } from 'express';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { PaymentMethodService } from './payment-methods.service';

export class PaymentMethodController {
    static async list(req: Request, res: Response) {
        const methods = await PaymentMethodService.list(req.params.user_id);
        res.status(HttpStatusCode.OK).json({ methods });
    }

    static async create(req: Request, res: Response) {
        const created = await PaymentMethodService.create(req.params.user_id, req.body);
        res.status(HttpStatusCode.CREATED).json({ method: created });
    }

    static async delete(req: Request, res: Response) {
        await PaymentMethodService.delete(req.params.payment_method_id, req.params.user_id);
        res.status(HttpStatusCode.NO_CONTENT).send();
    }

    static async setDefault(req: Request, res: Response) {
        await PaymentMethodService.setDefault(req.params.payment_method_id, req.params.user_id);
        res.status(HttpStatusCode.OK).json({ message: 'Default payment method updated' });
    }
}
