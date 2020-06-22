import { TStringifyableJsonObject } from 'rxjs-broker';

export type TPongEvent = TStringifyableJsonObject<{
    action: 'pong';

    message: number;
}>;
