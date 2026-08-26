import { Request, Response } from 'express';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { CouponService } from './coupons.service';

export class CouponController {
    static async list(_req: Request, res: Response) {
        const coupons = await CouponService.listActive();
        res.status(HttpStatusCode.OK).json({ coupons });
    }

    static async validate(req: Request, res: Response) {
        const { code, subtotal } = req.body;
        const result = await CouponService.validate(code, Number(subtotal));
        res.status(HttpStatusCode.OK).json(result);
    }

    static async apply(req: Request, res: Response) {
        const { code, subtotal } = req.body;
        const result = await CouponService.apply(code, Number(subtotal));
        res.status(HttpStatusCode.OK).json(result);
    }

    static async create(req: Request, res: Response) {
        const created = await CouponService.create(req.body);
        res.status(HttpStatusCode.CREATED).json({ coupon: created });
    }
}
