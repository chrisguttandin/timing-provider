import { Observable } from 'rxjs';
import { TDataChannelEvent } from './data-channel-event';

export type TDataChannelTuple = readonly [boolean, Observable<TDataChannelEvent & { timestamp: number }>, (event: TDataChannelEvent) => void];
