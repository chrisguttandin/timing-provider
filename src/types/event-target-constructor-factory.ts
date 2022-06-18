import { createEventTargetFactory } from '../factories/event-target-factory';
import { wrapEventListener as wrapEventListenerFunction } from '../functions/wrap-event-listener';
import { TEventTargetConstructor } from './event-target-constructor';

export type TEventTargetConstructorFactory = (
    createEventTarget: ReturnType<typeof createEventTargetFactory>,
    wrapEventListener: typeof wrapEventListenerFunction
) => TEventTargetConstructor;
