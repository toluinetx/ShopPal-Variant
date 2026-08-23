import { useState } from 'react';
import { TicketForm } from '@/pages/support/components/TicketForm.component';
import { TicketList } from '@/pages/support/components/TicketList.component';

export function SupportPage() {
    const [refreshToken, setRefreshToken] = useState(0);

    return (
        <main className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-8 text-text-950">
            <section>
                <h1 className="text-3xl font-bold">Support Center</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Open a ticket for orders, payments, shipping, or anything else. Our
                    team responds within one business day.
                </p>
            </section>

            <section className="grid grid-cols-1 gap-8 tablet-lg:grid-cols-2">
                <TicketForm onCreated={() => setRefreshToken((n) => n + 1)} />
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Your tickets</h2>
                    <TicketList refreshToken={refreshToken} />
                </div>
            </section>
        </main>
    );
}
