import { IPingEvent, IPongEvent, IUpdateEvent } from '../interfaces';

export type TOutgoingDataChannelEvent = IPingEvent | IPongEvent | IUpdateEvent;
