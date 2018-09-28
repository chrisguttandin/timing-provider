import { Observable } from 'rxjs';
import { IMaskableSubject, TStringifyableJsonValue } from 'rxjs-broker';
import { IEventTargetConstructor, ITimingProviderConstructor } from '../interfaces';

export type TTimingProviderConstructorFactory = (
    estimatedOffset: (openedDataChannelSubjects: Observable<IMaskableSubject<TStringifyableJsonValue>>) => Observable<number>,
    eventTargetConstructor: IEventTargetConstructor,
    fetch: Window['fetch'],
    performance: Window['performance'],
    setTimeout: Window['setTimeout']
) => ITimingProviderConstructor;
