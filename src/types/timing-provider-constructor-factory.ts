import { createSignaling as createSignalingFunction } from '../factories/signaling';
import { TEventTargetConstructor } from './event-target-constructor';
import { TTimingProviderConstructor } from './timing-provider-constructor';
import { TWaitForEventFunction } from './wait-for-event-function';

export type TTimingProviderConstructorFactory = (
    createSignaling: typeof createSignalingFunction,
    eventTargetConstructor: TEventTargetConstructor,
    performance: Window['performance'],
    setTimeout: Window['setTimeout'],
    waitForEvent: TWaitForEventFunction
) => TTimingProviderConstructor;
