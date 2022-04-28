import { TStringifyableJsonObject } from 'rxjs-broker';
import { TExtendedTimingStateVector } from './extended-timing-state-vector';

export type TUpdateEvent = TStringifyableJsonObject<{
    message: TStringifyableJsonObject<{ [P in keyof TExtendedTimingStateVector]: TExtendedTimingStateVector[P] }>;

    timestamp?: number;

    type: 'update';
}>;
