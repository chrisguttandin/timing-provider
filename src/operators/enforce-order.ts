import { MonoTypeOperatorFunction, concatMap, from, scan } from 'rxjs';

export const enforceOrder =
    <FirstValue, SubsequentValue>(
        isFirstValue: (value: FirstValue | SubsequentValue) => value is FirstValue
    ): MonoTypeOperatorFunction<FirstValue | SubsequentValue> =>
    (source) =>
        source.pipe(
            scan<FirstValue | SubsequentValue, [(FirstValue | SubsequentValue)[], null | SubsequentValue[]]>(
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
