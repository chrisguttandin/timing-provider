import { Subject, ignoreElements, interval, map, startWith, tap, withLatestFrom } from 'rxjs';

export const sendPeriodicPings = (localSentTimesSubject: Subject<[number, number[]]>, sendPing: (index: number) => void) =>
    interval(1000).pipe(
        startWith(0),
        map((_, index) => {
            sendPing(index);

            return performance.now();
        }),
        withLatestFrom(localSentTimesSubject),
        tap(([localSentTime, [startIndex, localSentTimes]]) =>
            localSentTimesSubject.next([startIndex, [...localSentTimes, localSentTime]])
        ),
        ignoreElements()
    );
