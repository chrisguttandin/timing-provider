import { OperatorFunction, filter, scan } from 'rxjs';

const INITIAL_VALUE = Symbol();

export const combineAsTuple =
    <FirstElement, SecondElement>(): OperatorFunction<
        readonly [0, FirstElement] | readonly [1, SecondElement],
        readonly [FirstElement, SecondElement]
    > =>
    (source) =>
        source.pipe(
            scan<
                readonly [0, FirstElement] | readonly [1, SecondElement],
                readonly [typeof INITIAL_VALUE | FirstElement, typeof INITIAL_VALUE | SecondElement],
                readonly [typeof INITIAL_VALUE, typeof INITIAL_VALUE]
            >(
                (lastValue, [index, value]) => {
                    if (index === 0) {
                        return [value, lastValue[1]];
                    }

                    return [lastValue[0], value];
                },
                [INITIAL_VALUE, INITIAL_VALUE]
            ),
            filter((tuple): tuple is readonly [FirstElement, SecondElement] => tuple.every((element) => element !== INITIAL_VALUE))
        );
