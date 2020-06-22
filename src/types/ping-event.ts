import { TStringifyableJsonObject } from 'rxjs-broker';

export type TPingEvent = TStringifyableJsonObject<{
    action: 'ping';

    message: undefined;
}>;
