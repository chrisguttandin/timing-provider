import { Observable, finalize, map, merge, mergeMap, throwError } from 'rxjs';
import { on } from 'subscribable-things';
import { ICheckEvent } from '../interfaces';
import { TClientEvent, TWebSocketEvent } from '../types';

export const createSignalingFactory =
    (createWebSocket: (url: string) => WebSocket) =>
    (url: string): readonly [Observable<TWebSocketEvent>, (event: ICheckEvent | TClientEvent) => void] => {
        const webSocket = createWebSocket(url);
        const message$ = merge(
            on(webSocket, 'message'),
            merge(on(webSocket, 'close'), on(webSocket, 'error')).pipe(
                mergeMap(({ type }) =>
                    // tslint:disable-next-line:rxjs-throw-error
                    throwError(() => new Error(`WebSocket fired unexpected event of type "${type}".`))
                )
            )
        ).pipe(
            finalize(() => webSocket.close()),
            map((event) => <TWebSocketEvent>JSON.parse(event.data))
        );
        const send = (event: ICheckEvent | TClientEvent) => webSocket.send(JSON.stringify(event));

        return [message$, send] as const;
    };
