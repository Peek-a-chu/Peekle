import stone from './stone.svg';
import bronze from './bronze.svg';
import silver from './silver.svg';
import gold from './gold.svg';
import platinum from './platinum.svg';
import emerald from './emerald.svg';
import diamond from './diamond.svg';
import ruby from './ruby.svg';

export const LEAGUE_ICONS = {
    stone,
    bronze,
    silver,
    gold,
    platinum,
    emerald,
    diamond,
    ruby,
} as const;

export type LeagueIconKey = keyof typeof LEAGUE_ICONS;
