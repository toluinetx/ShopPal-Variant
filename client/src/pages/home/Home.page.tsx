import { HeaderSection, BannerSection } from '@/pages/home/components';
import { RecentlyViewedStrip } from '@/shared/components/RecentlyViewedStrip';

export function HomePage() {
    return (
        <div className="flex w-full flex-col">
            <main
                className="container mx-auto flex flex-1 flex-row items-center justify-between gap-4 text-text-950
                tablet-lg:flex-col-reverse tablet-lg:justify-around tablet-lg:gap-0
                tablet-sm:mt-20 tablet-sm:justify-end tablet-sm:gap-10"
            >
                <HeaderSection />
                <BannerSection />
            </main>
            <div className="container mx-auto mt-8 px-4">
                <RecentlyViewedStrip />
            </div>
        </div>
    );
}
