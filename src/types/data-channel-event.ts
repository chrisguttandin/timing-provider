import { IPingEvent, IPongEvent, IUpdateEvent } from '../interfaces';

export type TDataChannelEvent = IPingEvent | IPongEvent | IUpdateEvent;
