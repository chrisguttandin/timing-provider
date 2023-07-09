import { Observable, Subject, finalize, map, merge, mergeMap, throwError } from 'rxjs';
import { on } from 'subscribable-things';
import { TIncomingSignalingEvent, TOutgoingSignalingEvent } from '../types';

export const createSignalingFactory =
    (createWebSocket: (url: string) => WebSocket) =>
    (url: string): readonly [Observable<TIncomingSignalingEvent>, (event: TOutgoingSignalingEvent) => void] => {
        const errorSubject = new Subject<Error>();
        const webSocket = createWebSocket(url);
        const signalingEvent$ = merge(
            on(webSocket, 'message'),
            merge(
                merge(...['close', 'error'].map((type) => on(webSocket, type))).pipe(
                    map(({ type }) => new Error(`WebSocket fired unexpected event of type "${type}".`))
                ),
                errorSubject
                // tslint:disable-next-line:rxjs-throw-error
            ).pipe(mergeMap((err) => throwError(() => err)))
        ).pipe(
            finalize(() => webSocket.close()),
            map((event) => <TIncomingSignalingEvent>JSON.parse(event.data))
        );
        const sendSignalingEvent = (event: TOutgoingSignalingEvent) => {
            try {
                webSocket.send(JSON.stringify(event));
            } catch (err) {
                errorSubject.next(err);
            }
        };

        return [signalingEvent$, sendSignalingEvent] as const;
    };
