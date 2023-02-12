import { OperatorFunction, Subject, filter, map, withLatestFrom } from 'rxjs';
import { isNotNullish } from 'rxjs-etc';
import { IPongEvent } from '../interfaces';

export const matchPongWithPing =
    (
        localSentTimesSubject: Subject<[number, number[]]>
    ): OperatorFunction<IPongEvent & { timestamp: number }, readonly [number, number, number, number]> =>
    (source) =>
        source.pipe(
            withLatestFrom(localSentTimesSubject),
            map(([{ index, remoteReceivedTime, remoteSentTime, timestamp }, [startIndex, localSentTimes]]) => {
                if (index < startIndex) {
                    return null;
                }

                const numberOfMissingPings = index - startIndex;
                const [localSentTime, ...unansweredPings] = localSentTimes.slice(numberOfMissingPings);

                localSentTimesSubject.next([startIndex + numberOfMissingPings + 1, unansweredPings]);

                return <const>[localSentTime, remoteReceivedTime, remoteSentTime, timestamp];
            }),
            filter(isNotNullish)
        );
