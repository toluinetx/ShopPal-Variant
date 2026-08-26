import { useState } from 'react';
import { useApi } from '@/shared/hooks/useApi.hook';

type CouponSectionProps = {
    subtotal: number;
    couponCode: string | null;
    setCouponCode: (code: string | null) => void;
    discount: number;
    setDiscount: (v: number) => void;
};

export function CouponSection({
    subtotal,
    couponCode,
    setCouponCode,
    discount,
    setDiscount,
}: CouponSectionProps) {
    const { couponApi } = useApi();
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const validate = async () => {
        if (!input.trim()) return;
        setBusy(true);
        setStatus(null);
        try {
            const res = await couponApi.validate(input.trim().toUpperCase(), subtotal);
            if (res.valid) {
                setCouponCode(res.coupon?.code ?? input.trim().toUpperCase());
                setDiscount(res.discount ?? 0);
                setStatus({
                    ok: true,
                    msg: `Applied \u2013 you save $${(res.discount ?? 0).toFixed(2)}`,
                });
            } else {
                setStatus({ ok: false, msg: res.reason ?? 'Invalid coupon' });
                setCouponCode(null);
                setDiscount(0);
            }
        } catch {
            setStatus({ ok: false, msg: 'Could not validate coupon' });
        } finally {
            setBusy(false);
        }
    };

    const clear = () => {
        setInput('');
        setCouponCode(null);
        setDiscount(0);
        setStatus(null);
    };

    return (
        <div className="rounded-md border border-primary-100 bg-white p-3">
            <label className="mb-2 block text-sm font-semibold">Have a coupon?</label>
            {couponCode ? (
                <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-sm">
                    <span>
                        <b>{couponCode}</b> applied — you save ${discount.toFixed(2)}
                    </span>
                    <button
                        onClick={clear}
                        className="rounded-md border border-primary-300 px-2 py-1 text-xs font-medium hover:bg-primary-50"
                    >
                        Remove
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value.toUpperCase())}
                            placeholder="WELCOME10"
                            className="flex-1 rounded-md border border-primary-200 px-3 py-2 text-sm"
                        />
                        <button
                            onClick={validate}
                            disabled={busy || !input.trim()}
                            className="rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {busy ? '...' : 'Apply'}
                        </button>
                    </div>
                    {status && (
                        <p className={`mt-2 text-xs ${status.ok ? 'text-green-700' : 'text-red-700'}`}>
                            {status.msg}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
