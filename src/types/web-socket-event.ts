import { IInitEvent, INoticeEvent, IRequestEvent, ITerminationEvent } from '../interfaces';
import { TClientEvent } from './client-event';

export type TWebSocketEvent = TClientEvent | IInitEvent | INoticeEvent | IRequestEvent | ITerminationEvent;
