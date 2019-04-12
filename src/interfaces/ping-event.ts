import { IStringifyableJsonObject } from 'rxjs-broker';

export interface IPingEvent extends IStringifyableJsonObject {

    message: undefined;

    type: 'ping';

}
