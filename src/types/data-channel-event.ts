import { TPingEvent } from './ping-event';
import { TPongEvent } from './pong-event';
import { TRequestEvent } from './request-event';
import { TUpdateEvent } from './update-event';

export type TDataChannelEvent = TPingEvent | TPongEvent | TRequestEvent | TUpdateEvent;
