import AppError from '@/shared/exceptions/app-error';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { PaymentMethod } from '@/shared/models/entities';
import { PaymentMethodRepository } from './payment-methods.repository';

export class PaymentMethodService {
    static async list(user_id: string) {
        return PaymentMethodRepository.list(user_id);
    }

    static async create(user_id: string, payload: Partial<PaymentMethod>) {
        if (payload.is_default) {
            await PaymentMethodRepository.clearDefault(user_id);
        }
        return PaymentMethodRepository.create({ ...payload, user_id });
    }

    static async delete(payment_method_id: string, user_id: string) {
        const result = await PaymentMethodRepository.delete(payment_method_id, user_id);
        if (result.affected === 0) {
            throw new AppError('Payment method not found', HttpStatusCode.NOT_FOUND, 'delete-payment-method');
        }
    }

    static async setDefault(payment_method_id: string, user_id: string) {
        const existing = await PaymentMethodRepository.findByIdForUser(payment_method_id, user_id);
        if (!existing) {
            throw new AppError('Payment method not found', HttpStatusCode.NOT_FOUND, 'setDefault-payment-method');
        }
        await PaymentMethodRepository.clearDefault(user_id);
        await PaymentMethodRepository.setDefault(payment_method_id, user_id);
    }
}
