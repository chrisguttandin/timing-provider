import { OperatorFunction, scan } from 'rxjs';

export const combineAsTuple =
    <FirstElement, SecondElement>(
        initialValue: readonly [FirstElement, SecondElement]
    ): OperatorFunction<readonly [0, FirstElement] | readonly [1, SecondElement], readonly [FirstElement, SecondElement]> =>
    (source) =>
        source.pipe(
            scan((lastValue, [index, value]) => {
                if (index === 0) {
                    return [value, lastValue[1]] as const;
                }

                return [lastValue[0], value] as const;
            }, initialValue)
        );
