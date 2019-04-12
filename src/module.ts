import { createEstimateOffset } from './factories/estimate-offset';
import { createEventTargetConstructor } from './factories/event-target-constructor';
import { createTimingProviderConstructor } from './factories/timing-provider-constructor';
import { TEventTargetConstructor, TTimingProviderConstructor } from './types';

export * from './interfaces';
export * from './types';

const eventTargetConstructor: TEventTargetConstructor = createEventTargetConstructor(document);

const timingProviderConstructor: TTimingProviderConstructor = createTimingProviderConstructor(
    createEstimateOffset(performance),
    eventTargetConstructor,
    fetch,
    performance,
    setTimeout
);

export { timingProviderConstructor as TimingProvider };

// @todo Expose an isSupported flag which checks for fetch and performance.now() support.
