import { OperatorFunction, connect, partition, takeUntil, tap } from 'rxjs';

export const takeUntilFatalValue = <OtherValue, FatalValue extends OtherValue>(
    isFatalValue: (value: OtherValue) => value is FatalValue,
    handleFatalValue: (value: FatalValue) => unknown
): OperatorFunction<OtherValue, Exclude<OtherValue, FatalValue>> =>
    connect((values$) => {
        const [fatalEvent$, otherEvent$] = partition(values$, isFatalValue);

        return otherEvent$.pipe(takeUntil(fatalEvent$.pipe(tap(<any>handleFatalValue))));
    });
