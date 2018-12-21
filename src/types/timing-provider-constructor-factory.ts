import { Observable } from 'rxjs';
import { IMaskableSubject, TStringifyableJsonValue } from 'rxjs-broker';
import { TEventTargetConstructor, TTimingProviderConstructor } from '../types';

export type TTimingProviderConstructorFactory = (
    estimatedOffset: (openedDataChannelSubjects: Observable<IMaskableSubject<TStringifyableJsonValue>>) => Observable<number>,
    eventTargetConstructor: TEventTargetConstructor,
    fetch: Window['fetch'],
    performance: Window['performance'],
    setTimeout: Window['setTimeout']
) => TTimingProviderConstructor;
