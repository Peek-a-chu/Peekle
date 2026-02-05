import stone from './stone.svg?url';
import bronze from './bronze.svg?url';
import silver from './silver.svg?url';
import gold from './gold.svg?url';
import platinum from './platinum.svg?url';
import emerald from './emerald.svg?url';
import diamond from './diamond.svg?url';
import ruby from './ruby.svg?url';

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
