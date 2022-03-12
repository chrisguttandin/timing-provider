import { IInitEvent, IRequestEvent, ITerminationEvent } from '../interfaces';
import { TClientEvent } from './client-event';

export type TWebSocketEvent = TClientEvent | IInitEvent | IRequestEvent | ITerminationEvent;
