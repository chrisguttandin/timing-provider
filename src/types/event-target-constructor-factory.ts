import { wrapEventListener as wrapEventListenerFunction } from '../functions/wrap-event-listener';
import { TEventTargetConstructor } from './event-target-constructor';
import { TEventTargetFactory } from './event-target-factory';

export type TEventTargetConstructorFactory = (
    createEventTarget: TEventTargetFactory,
    wrapEventListener: typeof wrapEventListenerFunction
) => TEventTargetConstructor;
