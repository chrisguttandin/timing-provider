import { IRequestEvent } from "./request-event";

export interface IInitEvent {
    events: IRequestEvent[];

    origin: number;

    type: 'init';
}
