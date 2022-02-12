import { TStringifyableJsonObject } from 'rxjs-broker';

export type TPongEvent = TStringifyableJsonObject<{
    message: [number, number];

    timestamp?: number;

    type: 'pong';
}>;
