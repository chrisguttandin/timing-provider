import { IStringifyableJsonObject } from 'rxjs-broker';

export interface IPongEvent extends IStringifyableJsonObject {

    message: number;

    type: 'pong';

}
