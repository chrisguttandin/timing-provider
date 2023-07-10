import { INoticeEvent } from './notice-event';
import { IRequestEvent } from './request-event';

export interface IInitEvent {
    client: {
        id: string;
    };

    events: (INoticeEvent | IRequestEvent)[];

    origin: number;

    type: 'init';
}
