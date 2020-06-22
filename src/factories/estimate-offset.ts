import { interval, zip } from 'rxjs';
import { mask } from 'rxjs-broker';
import { finalize, map, scan, startWith, tap } from 'rxjs/operators';
import { TDataChannelEvent, TEstimateOffsetFactory, TPingEvent, TPongEvent } from '../types';

export const createEstimateOffset: TEstimateOffsetFactory = (performance) => {
    return (dataChannelSubject) => {
        const pingSubject = mask<undefined, TPingEvent, TDataChannelEvent>({ action: 'ping' }, dataChannelSubject);
        const pongSubject = mask<number, TPongEvent, TDataChannelEvent>({ action: 'pong' }, dataChannelSubject);

        // Respond to every ping event with the current value returned by performance.now().
        const pingSubjectSubscription = pingSubject.subscribe(() => pongSubject.send(performance.now()));

        return zip(
            interval(1000).pipe(
                startWith(),
                // @todo It should be okay to send an empty message.
                tap(() => pingSubject.send(undefined)),
                map(() => performance.now())
            ),
            pongSubject
        ).pipe(
            finalize(() => pingSubjectSubscription.unsubscribe()),
            // This will compute the offset with the formula "remoteTime - localTime".
            map(([pingTime, pongTime]) => pongTime - (pingTime + performance.now()) / 2),
            scan<number, number[]>((latestValues, newValue) => [...latestValues.slice(-4), newValue], []),
            // @todo Do fire an update event whenever the offset changes.
            map((values) => values.reduce((sum, currentValue) => sum + currentValue, 0) / values.length),
            map((offset) => offset / 1000)
        );
    };
};
