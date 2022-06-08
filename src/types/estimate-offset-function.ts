import { Observable } from 'rxjs';
import { TDataChannelEvent } from '../module';

export type TEstimateOffsetFunction = (
    message$: Observable<TDataChannelEvent>,
    send: (event: TDataChannelEvent) => void
) => Observable<number>;
