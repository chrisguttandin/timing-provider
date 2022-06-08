import { Observable } from 'rxjs';
import { TDataChannelEvent } from './data-channel-event';

export type TDataChannelTuple = readonly [boolean, Observable<TDataChannelEvent>, (event: TDataChannelEvent) => void];
