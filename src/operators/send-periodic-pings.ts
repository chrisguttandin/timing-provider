import { MonoTypeOperatorFunction, Subject, finalize, ignoreElements, map, merge, takeUntil, tap, timer, withLatestFrom } from 'rxjs';

export const sendPeriodicPings =
    <Value>(
        localSentTimesSubject: Subject<[number, number[]]>,
        now: () => number,
        sendPing: (index: number) => void
    ): MonoTypeOperatorFunction<Value> =>
    (source) => {
        const closeSubject = new Subject<null>();

        return merge(
            source.pipe(finalize(() => closeSubject.next(null))),
            timer(0, 1000).pipe(
                takeUntil(closeSubject),
                map((_, index) => {
                    sendPing(index);

                    return now();
                }),
                withLatestFrom(localSentTimesSubject),
                tap(([localSentTime, [startIndex, localSentTimes]]) =>
                    localSentTimesSubject.next([startIndex, [...localSentTimes, localSentTime]])
                ),
                ignoreElements()
            )
        );
    };
