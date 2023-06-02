import type { compareHops as compareHopsFunction } from '../functions/compare-hops';

export const createSortByHops =
    (compareHops: typeof compareHopsFunction) => (dataChannelSubjectsAndExtendedVectors: [{ hops: number[] }, ...unknown[]][]) => {
        dataChannelSubjectsAndExtendedVectors.sort(([{ hops: hopsA }], [{ hops: hopsB }]) => compareHops(hopsA, hopsB));
    };
