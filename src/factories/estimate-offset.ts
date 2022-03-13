import { EMPTY, catchError, filter, finalize, interval, map, scan, startWith, tap, zip } from 'rxjs';
import { computeOffset } from '../operators/compute-offset';
import { TEstimateOffsetFactory, TPingEvent, TPongEvent } from '../types';

export const createEstimateOffset: TEstimateOffsetFactory = (performance) => {
    return (dataChannelSubject) => {
        const ping$ = dataChannelSubject.pipe(
            filter((event): event is TPingEvent => event.type === 'ping'),
            map(({ timestamp }) => timestamp ?? performance.now())
        );
        const pong$ = dataChannelSubject.pipe(
            filter((event): event is TPongEvent => event.type === 'pong'),
            map(({ message, timestamp }) => [...message, timestamp ?? performance.now()] as const)
        );

        const sendPing = () => dataChannelSubject.next({ type: 'ping' });
        const sendPong = (eventTime: number, now: number) => dataChannelSubject.next({ message: [eventTime, now], type: 'pong' });

        // Respond to every ping event with the timestamp of the event itself and the value returned by performance.now().
        const pingSubjectSubscription = ping$
            .pipe(catchError(() => EMPTY))
            .subscribe((eventTime) => sendPong(eventTime, performance.now())); // tslint:disable-line:deprecation

        return zip(
            interval(1000).pipe(
                startWith(),
                tap(() => sendPing()),
                map(() => performance.now())
            ),
            pong$
        ).pipe(
            finalize(() => pingSubjectSubscription.unsubscribe()),
            computeOffset(),
            scan<number, number[]>((latestValues, newValue) => [...latestValues.slice(-4), newValue], []),
            // @todo Do fire an update event whenever the offset changes.
            map((values) => values.reduce((sum, currentValue) => sum + currentValue, 0) / values.length),
            map((offset) => offset / 1000)
        );
    };
};
