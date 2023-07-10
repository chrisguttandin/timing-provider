import { IPingEvent, IPongEvent, IUpdateEvent } from '../interfaces';

export type TIncomingDataChannelEvent = ((IPingEvent | IPongEvent) & { timestamp: number }) | IUpdateEvent;
