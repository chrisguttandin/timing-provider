import { createEventTargetConstructor } from './factories/event-target-constructor';
import { createTimingProviderConstructor } from './factories/timing-provider-constructor';
import { estimatedOffset } from './helpers/estimated-offset';
import { IEventTargetConstructor, ITimingProviderConstructor } from './interfaces';

export * from './interfaces';
export * from './types';

const eventTargetConstructor: IEventTargetConstructor = createEventTargetConstructor(document);

const timingProviderConstructor: ITimingProviderConstructor = createTimingProviderConstructor(
    estimatedOffset,
    eventTargetConstructor,
    fetch,
    performance,
    setTimeout
);

export { timingProviderConstructor as TimingProvider };

// @todo Expose an isSupported flag which checks for fetch and performance.now() support.
