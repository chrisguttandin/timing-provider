import { TEstimateOffsetFunction } from './estimate-offset-function';
import { TEventTargetConstructor } from './event-target-constructor';
import { TTimingProviderConstructor } from './timing-provider-constructor';
import { TWaitForEventFunction } from './wait-for-event-function';

export type TTimingProviderConstructorFactory = (
    estimateOffset: TEstimateOffsetFunction,
    eventTargetConstructor: TEventTargetConstructor,
    fetch: Window['fetch'],
    performance: Window['performance'],
    setTimeout: Window['setTimeout'],
    waitForEvent: TWaitForEventFunction
) => TTimingProviderConstructor;
