import {
    EMPTY,
    MonoTypeOperatorFunction,
    Observable,
    concat,
    dematerialize,
    filter,
    ignoreElements,
    materialize,
    of,
    startWith,
    switchMap,
    takeWhile,
    tap
} from 'rxjs';
import { isNotNullish } from 'rxjs-etc';

export const echo =
    <T, U>(
        callback: (value: U) => void,
        predicate: (value: U, index: number) => boolean,
        timer: Observable<U>
    ): MonoTypeOperatorFunction<T> =>
    (source) =>
        source.pipe(
            materialize(),
            startWith(null),
            switchMap((notification) =>
                concat(
                    of(notification),
                    notification === null || notification.kind === 'N'
                        ? timer.pipe(takeWhile(predicate), tap(callback), ignoreElements())
                        : EMPTY
                )
            ),
            filter(isNotNullish),
            dematerialize()
        );
