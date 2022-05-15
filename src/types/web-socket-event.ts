import { IClosureEvent, IInitEvent, INoticeEvent, IRequestEvent, ITerminationEvent } from '../interfaces';
import { TClientEvent } from './client-event';

export type TWebSocketEvent = TClientEvent | IClosureEvent | IInitEvent | INoticeEvent | IRequestEvent | ITerminationEvent;
