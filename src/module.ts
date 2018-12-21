import { createEventTargetConstructor } from './factories/event-target-constructor';
import { createTimingProviderConstructor } from './factories/timing-provider-constructor';
import { estimatedOffset } from './helpers/estimated-offset';
import { TEventTargetConstructor, TTimingProviderConstructor } from './types';

export * from './types';

const eventTargetConstructor: TEventTargetConstructor = createEventTargetConstructor(document);

const timingProviderConstructor: TTimingProviderConstructor = createTimingProviderConstructor(
    estimatedOffset,
    eventTargetConstructor,
    fetch,
    performance,
    setTimeout
);

export { timingProviderConstructor as TimingProvider };

// @todo Expose an isSupported flag which checks for fetch and performance.now() support.
