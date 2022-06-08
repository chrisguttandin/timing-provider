import { Observable, OperatorFunction, from, mergeMap } from 'rxjs';

export const filterUniqueValues =
    <Value extends object>(): OperatorFunction<(null | Value)[], Value> =>
    (source) =>
        new Observable((observer) => {
            const emittedValues = new WeakSet<Value>();

            return source
                .pipe(
                    mergeMap((values) => {
                        const newValues = values.filter((value): value is Value => value !== null && !emittedValues.has(value));

                        newValues.forEach((value) => emittedValues.add(value));

                        return from(newValues);
                    })
                )
                .subscribe(observer);
        });
