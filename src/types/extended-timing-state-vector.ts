import type { ITimingStateVector } from 'timing-object';

export type TExtendedTimingStateVector = ITimingStateVector & {
    readonly hops: number[];

    readonly version: number;
};
