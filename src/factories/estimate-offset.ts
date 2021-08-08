import { EMPTY, interval, zip } from 'rxjs';
import { catchError, filter, finalize, map, scan, startWith, tap } from 'rxjs/operators';
import { TEstimateOffsetFactory, TPingEvent, TPongEvent } from '../types';

export const createEstimateOffset: TEstimateOffsetFactory = (performance) => {
    return (dataChannelSubject) => {
        const ping$ = dataChannelSubject.pipe(filter((event): event is TPingEvent => event.type === 'ping'));
        const pong$ = dataChannelSubject.pipe(
            filter((event): event is TPongEvent => event.type === 'pong'),
            map(({ message, timestamp }) => [message, timestamp ?? performance.now()] as const)
        );

        const sendPing = () => dataChannelSubject.next({ type: 'ping' });
        const sendPong = (now: number) => dataChannelSubject.next({ message: now, type: 'pong' });

        // Respond to every ping event with the current value returned by performance.now().
        const pingSubjectSubscription = ping$.pipe(catchError(() => EMPTY)).subscribe(() => sendPong(performance.now())); // tslint:disable-line:deprecation

        return zip(
            interval(1000).pipe(
                startWith(),
                tap(() => sendPing()),
                map(() => performance.now())
            ),
            pong$
        ).pipe(
            finalize(() => pingSubjectSubscription.unsubscribe()),
            // This will compute the offset with the formula "remoteTime - localTime".
            map(([pingTime, [pongTime, eventTime]]) => pongTime - (pingTime + eventTime) / 2),
            scan<number, number[]>((latestValues, newValue) => [...latestValues.slice(-4), newValue], []),
            // @todo Do fire an update event whenever the offset changes.
            map((values) => values.reduce((sum, currentValue) => sum + currentValue, 0) / values.length),
            map((offset) => offset / 1000)
        );
    };
};
