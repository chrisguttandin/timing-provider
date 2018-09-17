import { ITimingProvider } from 'timing-object';

export interface ITimingProviderConstructor {

    new (providerId: string): ITimingProvider;

}
