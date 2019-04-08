import { Observable } from 'rxjs';
import { IMaskableSubject, TStringifyableJsonValue } from 'rxjs-broker';

export type TEstimateOffsetFunction = (
    openedDataChannelSubjects: Observable<IMaskableSubject<TStringifyableJsonValue>>
) => Observable<number>;
