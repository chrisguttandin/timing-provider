import { createEstimateOffset } from './factories/estimate-offset';
import { createEventTargetConstructor } from './factories/event-target-constructor';
import { createTimingProviderConstructor } from './factories/timing-provider-constructor';
import { waitForEvent } from './functions/wait-for-event';
import { TEventTargetConstructor, TTimingProviderConstructor } from './types';

/*
 * @todo Explicitly referencing the barrel file seems to be necessary when enabling the
 * isolatedModules compiler option.
 */
export * from './types/index';

const eventTargetConstructor: TEventTargetConstructor = createEventTargetConstructor(document);

const timingProviderConstructor: TTimingProviderConstructor = createTimingProviderConstructor(
    createEstimateOffset(performance),
    eventTargetConstructor,
    performance,
    setTimeout,
    waitForEvent
);

export { timingProviderConstructor as TimingProvider };

// @todo Expose an isSupported flag which checks for fetch and performance.now() support.
