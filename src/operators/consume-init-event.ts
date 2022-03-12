import { OperatorFunction, connect, ignoreElements, merge, partition, tap } from 'rxjs';
import { IInitEvent } from '../interfaces';
import { TWebSocketEvent } from '../types';

export const consumeInitEvent = (
    isInitEvent: (event: TWebSocketEvent) => event is IInitEvent,
    consume: (event: IInitEvent) => unknown
): OperatorFunction<TWebSocketEvent, Exclude<TWebSocketEvent, IInitEvent>> =>
    connect((events$) => {
        const [initEvent$, signalingEvents$] = partition(events$, isInitEvent);

        return merge(initEvent$.pipe(tap(consume), ignoreElements()), signalingEvents$);
    });
