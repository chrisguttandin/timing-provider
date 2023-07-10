import { EMPTY, OperatorFunction, Subject, endWith, ignoreElements, interval, map, startWith, switchAll, tap, withLatestFrom } from 'rxjs';
import { TSendPeerToPeerMessageFunction } from '../types';

export const sendPeriodicPings =
    (
        localSentTimesSubject: Subject<[number, number[]]>,
        now: () => number
    ): OperatorFunction<[string, TSendPeerToPeerMessageFunction], never> =>
    (source) =>
        source.pipe(
            map(([, send]) =>
                interval(1000).pipe(
                    startWith(0),
                    map((_, index) => {
                        send({ index, type: 'ping' });

                        return now();
                    }),
                    withLatestFrom(localSentTimesSubject),
                    tap(([localSentTime, [startIndex, localSentTimes]]) =>
                        localSentTimesSubject.next([startIndex, [...localSentTimes, localSentTime]])
                    ),
                    ignoreElements()
                )
            ),
            endWith(EMPTY),
            switchAll()
        );
