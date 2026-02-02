import { create } from 'zustand';
import { LeagueType } from '@/components/LeagueIcon';

export type PromotionStatus = 'PROMOTE' | 'STAY' | 'DEMOTE';

interface LeaguePromotionState {
    isOpen: boolean;
    status: PromotionStatus;
    fromLeague: LeagueType;
    toLeague: LeagueType;
    percentile: number; // 상위 몇 %인지

    // Actions
    openModal: (data: {
        status: PromotionStatus;
        fromLeague: LeagueType;
        toLeague: LeagueType;
        percentile: number;
    }) => void;
    closeModal: () => void;
}

export const useLeaguePromotionStore = create<LeaguePromotionState>((set) => ({
    isOpen: false,
    status: 'STAY',
    fromLeague: 'bronze',
    toLeague: 'bronze',
    percentile: 50,

    openModal: (data) =>
        set({
            isOpen: true,
            status: data.status,
            fromLeague: data.fromLeague,
            toLeague: data.toLeague,
            percentile: data.percentile,
        }),

    closeModal: () => set({ isOpen: false }),
}));
