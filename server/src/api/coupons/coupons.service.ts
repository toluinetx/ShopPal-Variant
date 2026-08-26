import AppError from '@/shared/exceptions/app-error';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { Coupon, CouponType } from '@/shared/models/entities';
import { CouponRepository } from './coupons.repository';

export type ValidateCouponResult = {
    valid: boolean;
    reason?: string;
    coupon?: Coupon;
    discount?: number;
    total_after_discount?: number;
};

export class CouponService {
    static async listActive() {
        return CouponRepository.listActive();
    }

    static async validate(code: string, subtotal: number): Promise<ValidateCouponResult> {
        const coupon = await CouponRepository.findByCode(code);
        if (!coupon) return { valid: false, reason: 'Coupon code not found' };
        if (!coupon.active) return { valid: false, reason: 'Coupon is inactive' };

        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
            return { valid: false, reason: 'Coupon is not yet valid' };
        }
        if (coupon.valid_until && new Date(coupon.valid_until) < now) {
            return { valid: false, reason: 'Coupon has expired' };
        }
        if (coupon.usage_limit != null && coupon.times_used >= coupon.usage_limit) {
            return { valid: false, reason: 'Coupon usage limit reached' };
        }
        if (subtotal < coupon.min_order_total) {
            return {
                valid: false,
                reason: `Order must be at least ${coupon.min_order_total} to use this coupon`,
            };
        }

        let discount = coupon.type === CouponType.PERCENTAGE
            ? (subtotal * coupon.value) / 100
            : coupon.value;

        if (coupon.max_discount != null && discount > coupon.max_discount) {
            discount = coupon.max_discount;
        }
        discount = Math.min(discount, subtotal);
        discount = Math.round(discount * 100) / 100;

        return {
            valid: true,
            coupon,
            discount,
            total_after_discount: Math.round((subtotal - discount) * 100) / 100,
        };
    }

    static async apply(code: string, subtotal: number): Promise<ValidateCouponResult> {
        const result = await this.validate(code, subtotal);
        if (!result.valid) {
            throw new AppError(result.reason ?? 'Invalid coupon', HttpStatusCode.BAD_REQUEST, 'apply-coupon');
        }
        await CouponRepository.incrementUsage(code);
        return result;
    }

    static async create(payload: Partial<Coupon>) {
        const existing = await CouponRepository.findByCode(payload.code!);
        if (existing) {
            throw new AppError('Coupon code already exists', HttpStatusCode.CONFLICT, 'create-coupon');
        }
        return CouponRepository.create(payload);
    }
}
