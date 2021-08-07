import { TStringifyableJsonObject } from 'rxjs-broker';

export type TPingEvent = TStringifyableJsonObject<{
    type: 'ping';
}>;
