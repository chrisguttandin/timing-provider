import { Observable, finalize, map, merge, mergeMap, throwError } from 'rxjs';
import { on } from 'subscribable-things';
import { TIncomingSignalingEvent, TOutgoingSignalingEvent } from '../types';

export const createSignalingFactory =
    (createWebSocket: (url: string) => WebSocket) =>
    (url: string): readonly [Observable<TIncomingSignalingEvent>, (event: TOutgoingSignalingEvent) => void] => {
        const webSocket = createWebSocket(url);
        const signalingEvent$ = merge(
            on(webSocket, 'message'),
            merge(on(webSocket, 'close'), on(webSocket, 'error')).pipe(
                mergeMap(({ type }) =>
                    // tslint:disable-next-line:rxjs-throw-error
                    throwError(() => new Error(`WebSocket fired unexpected event of type "${type}".`))
                )
            )
        ).pipe(
            finalize(() => webSocket.close()),
            map((event) => <TIncomingSignalingEvent>JSON.parse(event.data))
        );
        const sendSignalingEvent = (event: TOutgoingSignalingEvent) => webSocket.send(JSON.stringify(event));

        return [signalingEvent$, sendSignalingEvent] as const;
    };
