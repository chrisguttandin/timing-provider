import { Observable } from 'rxjs';
import { IRemoteSubject } from 'rxjs-broker';
import { TDataChannelEvent } from './data-channel-event';

export type TEstimateOffsetFunction = (dataChannelSubject: IRemoteSubject<TDataChannelEvent>) => Observable<number>;
