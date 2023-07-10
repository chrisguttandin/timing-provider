import { createEventTargetConstructor } from './factories/event-target-constructor';
import { createEventTargetFactory } from './factories/event-target-factory';
import { createSignalingFactory } from './factories/signaling-factory';
import { createSortByHopsAndRoundTripTime } from './factories/sort-by-hops-and-round-trip-time';
import { createTimingProviderConstructor } from './factories/timing-provider-constructor';
import { createWindow } from './factories/window';
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
    createEventTargetConstructor(createEventTargetFactory(createWindow()), wrapEventListener),
    performance,
    setTimeout,
    createSortByHopsAndRoundTripTime<[unknown, { hops: number[] }, number]>(
        compareHops,
        ([, { hops }]) => hops,
        ([, , roundTripTime]) => roundTripTime
    )
);

export { timingProviderConstructor as TimingProvider };

// @todo Expose an isSupported flag which checks for fetch and performance.now() support.
