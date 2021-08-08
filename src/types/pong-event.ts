import { TStringifyableJsonObject } from 'rxjs-broker';

export type TPongEvent = TStringifyableJsonObject<{
    message: number;

    timestamp?: number;

    type: 'pong';
}>;
