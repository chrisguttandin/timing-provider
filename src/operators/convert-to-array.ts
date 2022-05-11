import { Observable, OperatorFunction, endWith, map, mergeMap, scan } from 'rxjs';

const LAST_VALUE = Symbol();

export const convertToArray =
    <T>(): OperatorFunction<Observable<T>, T[]> =>
    (source) =>
        source.pipe(
            mergeMap((observable, index) =>
                observable.pipe(
                    map((value) => <const>[index, value]),
                    endWith(<const>[index, LAST_VALUE])
                )
            ),
            scan((indexedValues, [index, value]) => {
                if (value === LAST_VALUE) {
                    indexedValues.delete(index);

                    return indexedValues;
                }

                return indexedValues.set(index, value);
            }, new Map<number, T>()),
            map((indexedValues) => Array.from(indexedValues.values()))
        );
