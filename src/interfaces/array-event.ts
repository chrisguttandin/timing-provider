import { INoticeEvent } from './notice-event';
import { IRequestEvent } from './request-event';

export interface IArrayEvent {
    events: (INoticeEvent | IRequestEvent)[];

    type: 'array';
}
