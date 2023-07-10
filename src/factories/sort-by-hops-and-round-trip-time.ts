import type { compareHops as compareHopsFunction } from '../functions/compare-hops';

export const createSortByHopsAndRoundTripTime =
    <Value>(compareHops: typeof compareHopsFunction, getHops: (value: Value) => number[], getRoundTripTime: (value: Value) => number) =>
    (array: Value[]) => {
        array.sort((a, b) => {
            const result = compareHops(getHops(a), getHops(b));

            if (result === 0) {
                return getRoundTripTime(a) - getRoundTripTime(b);
            }

            return result;
        });
    };
