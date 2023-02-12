import { OperatorFunction, map, scan } from 'rxjs';

export const selectMostLikelyOffset = (): OperatorFunction<[number, number], number> => (source) =>
    source.pipe(
        scan<[number, number], [number, number][]>((tuples, tuple) => [...tuples.slice(-59), tuple], []),
        map(
            (tuples) =>
                tuples
                    .slice(1)
                    .reduce(
                        (tupleWithSmallestRoundTripTime, tuple) =>
                            tupleWithSmallestRoundTripTime[1] < tuple[1] ? tupleWithSmallestRoundTripTime : tuple,
                        tuples[0]
                    )[0] / 1000
        )
    );
