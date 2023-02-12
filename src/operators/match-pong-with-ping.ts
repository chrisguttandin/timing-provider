import { OperatorFunction, Subject, filter, map, withLatestFrom } from 'rxjs';
import { isNotNullish } from 'rxjs-etc';
import { IPongEvent } from '../interfaces';

export const matchPongWithPing =
    (
        pingsSubject: Subject<[number, number[]]>
    ): OperatorFunction<IPongEvent & { timestamp: number; }, [number, readonly [number, number, number]]> =>
    (source) =>
        source.pipe(
            withLatestFrom(pingsSubject),
            map(([{ index: indexOfPong, message, timestamp }, [indexOfOldestPing, pings]]) => {
                if (indexOfPong < indexOfOldestPing) {
                    return null;
                }

                const difference = indexOfPong - indexOfOldestPing;
                const [localSendTime, ...unansweredPings] = pings.slice(difference);

                pingsSubject.next([indexOfOldestPing + difference + 1, unansweredPings]);

                return <[number, readonly [number, number, number]]>[localSendTime, <const>[...message, timestamp]];
            }),
            filter(isNotNullish)
        );
