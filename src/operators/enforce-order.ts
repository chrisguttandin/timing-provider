import { MonoTypeOperatorFunction, concatMap, from, scan } from 'rxjs';

export const enforceOrder =
    <FirstValue, SubsequentValues>(
        isFirstValue: (value: FirstValue | SubsequentValues) => value is FirstValue
    ): MonoTypeOperatorFunction<FirstValue | SubsequentValues> =>
    (source) =>
        source.pipe(
            scan<FirstValue | SubsequentValues, [(FirstValue | SubsequentValues)[], null | SubsequentValues[]]>(
                ([values, bufferedValues], value) => {
                    if (isFirstValue(value)) {
                        if (bufferedValues === null) {
                            throw new Error('Another value has been identified as the first value already.');
                        }

                        return [[value, ...bufferedValues], null];
                    }

                    if (bufferedValues === null) {
                        return [[value], bufferedValues];
                    }

                    return [values, [...bufferedValues, value]];
                },
                [[], []]
            ),
            concatMap(([values]) => from(values))
        );
