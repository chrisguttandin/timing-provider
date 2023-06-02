import { createEventTargetConstructor } from './factories/event-target-constructor';
import { createEventTargetFactory } from './factories/event-target-factory';
import { createSignalingFactory } from './factories/signaling-factory';
import { createSortByHops } from './factories/sort-by-hops';
import { createTimingProviderConstructor } from './factories/timing-provider-constructor';
import { compareHops } from './functions/compare-hops';
import { wrapEventListener } from './functions/wrap-event-listener';
import { TTimingProviderConstructor } from './types';

/*
 * @todo Explicitly referencing the barrel file seems to be necessary when enabling the
 * isolatedModules compiler option.
 */
export * from './types/index';

const timingProviderConstructor: TTimingProviderConstructor = createTimingProviderConstructor(
    createSignalingFactory((url) => new WebSocket(url)),
    createEventTargetConstructor(createEventTargetFactory(window), wrapEventListener),
    performance,
    setTimeout,
    createSortByHops(compareHops)
);

export { timingProviderConstructor as TimingProvider };

// @todo Expose an isSupported flag which checks for fetch and performance.now() support.
