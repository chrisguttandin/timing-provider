import { IEventTarget } from '../interfaces';

export type TEventTargetConstructor = new <EventMap extends Record<string, Event>>() => IEventTarget<EventMap>;
