import {
    EMPTY,
    MonoTypeOperatorFunction,
    Observable,
    concat,
    dematerialize,
    ignoreElements,
    materialize,
    of,
    switchMap,
    takeWhile,
    tap
} from 'rxjs';

export const echo =
    <T, U>(
        callback: (value: U) => void,
        predicate: (value: U, index: number) => boolean,
        timer: Observable<U>
    ): MonoTypeOperatorFunction<T> =>
    (source) =>
        source.pipe(
            materialize(),
            switchMap((notification) =>
                concat(
                    of(notification),
                    notification.kind === 'N' ? timer.pipe(takeWhile(predicate), tap(callback), ignoreElements()) : EMPTY
                )
            ),
            dematerialize()
        );
