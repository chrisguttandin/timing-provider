import { Observable, OperatorFunction, from, mergeMap } from 'rxjs';

export const filterUniqueValues =
    <Rest extends any[], Value extends object>(): OperatorFunction<[null | Value, ...Rest][], [Value, ...Rest]> =>
    (source) =>
        new Observable((observer) => {
            const values = new WeakSet<Value>();

            return source
                .pipe(
                    mergeMap((tuples) => {
                        const newTuples = tuples.filter((tuple): tuple is [Value, ...Rest] => tuple[0] !== null && !values.has(tuple[0]));

                        newTuples.forEach(([value]) => values.add(value));

                        return from(newTuples);
                    })
                )
                .subscribe(observer);
        });
