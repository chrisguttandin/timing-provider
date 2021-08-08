import { TStringifyableJsonObject } from 'rxjs-broker';

export type TRequestEvent = TStringifyableJsonObject<{
    timestamp?: number;

    type: 'request';
}>;
