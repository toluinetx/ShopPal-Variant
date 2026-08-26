import AppError from '@/shared/exceptions/app-error';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { SavedAddress } from '@/shared/models/entities';
import { AddressRepository } from './addresses.repository';

export class AddressService {
    static async list(user_id: string) {
        return AddressRepository.list(user_id);
    }

    static async create(user_id: string, payload: Partial<SavedAddress>): Promise<SavedAddress> {
        if (payload.is_default) {
            await AddressRepository.clearDefault(user_id);
        }
        return AddressRepository.create({ ...payload, user_id });
    }

    static async update(address_id: string, user_id: string, payload: Partial<SavedAddress>) {
        const existing = await AddressRepository.findByIdForUser(address_id, user_id);
        if (!existing) {
            throw new AppError('Address not found', HttpStatusCode.NOT_FOUND, 'update-address');
        }
        if (payload.is_default) {
            await AddressRepository.clearDefault(user_id);
        }
        await AddressRepository.update(address_id, user_id, payload);
    }

    static async delete(address_id: string, user_id: string) {
        const result = await AddressRepository.delete(address_id, user_id);
        if (result.affected === 0) {
            throw new AppError('Address not found', HttpStatusCode.NOT_FOUND, 'delete-address');
        }
    }

    static async setDefault(address_id: string, user_id: string) {
        const existing = await AddressRepository.findByIdForUser(address_id, user_id);
        if (!existing) {
            throw new AppError('Address not found', HttpStatusCode.NOT_FOUND, 'setDefault-address');
        }
        await AddressRepository.clearDefault(user_id);
        await AddressRepository.setDefault(address_id, user_id);
    }
}
