import { TPingEvent } from './ping-event';
import { TPongEvent } from './pong-event';
import { TUpdateEvent } from './update-event';

export type TDataChannelEvent = TPingEvent | TPongEvent | TUpdateEvent;
