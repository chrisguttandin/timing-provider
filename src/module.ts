import { createTimingProviderConstructor } from './factories/timing-provider-constructor';
import { estimatedOffset } from './helpers/estimated-offset';
import { ITimingProviderConstructor } from './interfaces';

export * from './interfaces';

const timingProviderConstructor: ITimingProviderConstructor = createTimingProviderConstructor(
    estimatedOffset, fetch, performance, setTimeout
);

export { timingProviderConstructor as TimingProvider };

// @todo Expose an isSupported flag which checks for fetch and performance.now() support.
