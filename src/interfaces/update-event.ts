import { IStringifyableJsonObject } from 'rxjs-broker';
import { ITimingStateVector } from 'timing-object';

export interface IUpdateEvent extends IStringifyableJsonObject {

    message: ITimingStateVector & IStringifyableJsonObject;

    type: 'update';

}
