import { Subject, ignoreElements, interval, map, startWith, tap, withLatestFrom } from 'rxjs';

export const sendPeriodicPings = (pingsSubject: Subject<[number, number[]]>, sendPing: (index: number) => void) =>
    interval(1000).pipe(
        startWith(0),
        map((_, index) => {
            sendPing(index);

            return performance.now();
        }),
        withLatestFrom(pingsSubject),
        tap(([ping, [index, pings]]) => pingsSubject.next([index, [...pings, ping]])),
        ignoreElements()
    );
