import { createSignalingFactory } from '../factories/signaling-factory';
import { TEventTargetConstructor } from './event-target-constructor';
import { TTimingProviderConstructor } from './timing-provider-constructor';

export type TTimingProviderConstructorFactory = (
    createSignaling: ReturnType<typeof createSignalingFactory>,
    eventTargetConstructor: TEventTargetConstructor,
    performance: Window['performance'],
    setTimeout: Window['setTimeout']
) => TTimingProviderConstructor;
