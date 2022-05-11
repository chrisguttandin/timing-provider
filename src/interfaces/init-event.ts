import { INoticeEvent } from './notice-event';
import { IRequestEvent } from './request-event';

export interface IInitEvent {
    events: (INoticeEvent | IRequestEvent)[];

    origin: number;

    type: 'init';
}
