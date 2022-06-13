import { TEventTargetConstructor } from './event-target-constructor';
import { TTimingProviderConstructor } from './timing-provider-constructor';
import { TWaitForEventFunction } from './wait-for-event-function';

export type TTimingProviderConstructorFactory = (
    eventTargetConstructor: TEventTargetConstructor,
    performance: Window['performance'],
    setTimeout: Window['setTimeout'],
    waitForEvent: TWaitForEventFunction
) => TTimingProviderConstructor;
