import { createEventTargetConstructor } from './factories/event-target-constructor';
import { createEventTargetFactory } from './factories/event-target-factory';
import { createSignaling } from './factories/signaling';
import { createTimingProviderConstructor } from './factories/timing-provider-constructor';
import { waitForEvent } from './functions/wait-for-event';
import { wrapEventListener } from './functions/wrap-event-listener';
import { TTimingProviderConstructor } from './types';

/*
 * @todo Explicitly referencing the barrel file seems to be necessary when enabling the
 * isolatedModules compiler option.
 */
export * from './types/index';

const timingProviderConstructor: TTimingProviderConstructor = createTimingProviderConstructor(
    createSignaling,
    createEventTargetConstructor(createEventTargetFactory(window), wrapEventListener),
    performance,
    setTimeout,
    waitForEvent
);

export { timingProviderConstructor as TimingProvider };

// @todo Expose an isSupported flag which checks for fetch and performance.now() support.
