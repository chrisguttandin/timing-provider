import { TStringifyableJsonObject } from 'rxjs-broker';

export type TRequestEvent = TStringifyableJsonObject<{
    type: 'request';
}>;
