import { TStringifyableJsonObject } from 'rxjs-broker';

export type TPingEvent = TStringifyableJsonObject<{
    timestamp?: number;

    type: 'ping';
}>;
