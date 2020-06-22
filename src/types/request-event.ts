import { TStringifyableJsonObject } from 'rxjs-broker';

export type TRequestEvent = TStringifyableJsonObject<{
    message: undefined;

    type: 'request';
}>;
