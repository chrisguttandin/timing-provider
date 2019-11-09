import { TStringifyableJsonObject } from 'rxjs-broker';
import { ITimingStateVector } from 'timing-object';

export type TUpdateEvent = TStringifyableJsonObject<{

    message: TStringifyableJsonObject<{ [ P in keyof ITimingStateVector ]: ITimingStateVector[P] }>;

    type: 'update';

}>;
