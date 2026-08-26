import { Request, Response } from 'express';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { AddressService } from './addresses.service';

export class AddressController {
    static async list(req: Request, res: Response) {
        const addresses = await AddressService.list(req.params.user_id);
        res.status(HttpStatusCode.OK).json({ addresses });
    }

    static async create(req: Request, res: Response) {
        const created = await AddressService.create(req.params.user_id, req.body);
        res.status(HttpStatusCode.CREATED).json({ address: created });
    }

    static async update(req: Request, res: Response) {
        await AddressService.update(req.params.address_id, req.params.user_id, req.body);
        res.status(HttpStatusCode.NO_CONTENT).send();
    }

    static async delete(req: Request, res: Response) {
        await AddressService.delete(req.params.address_id, req.params.user_id);
        res.status(HttpStatusCode.NO_CONTENT).send();
    }

    static async setDefault(req: Request, res: Response) {
        await AddressService.setDefault(req.params.address_id, req.params.user_id);
        res.status(HttpStatusCode.OK).json({ message: 'Default address updated' });
    }
}
