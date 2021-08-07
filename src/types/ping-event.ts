import { TStringifyableJsonObject } from 'rxjs-broker';

export type TPingEvent = TStringifyableJsonObject<{
    message: undefined;

    type: 'ping';
}>;
