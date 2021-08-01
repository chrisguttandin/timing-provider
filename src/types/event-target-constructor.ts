import { IEventTarget } from '../interfaces';

export type TEventTargetConstructor<EventMap extends Record<string, Event>> = new () => IEventTarget<EventMap>;
