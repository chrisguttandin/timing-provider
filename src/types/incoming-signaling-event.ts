import { IArrayEvent, IClosureEvent, IInitEvent, ITerminationEvent } from '../interfaces';
import { TIncomingNegotiationEvent } from './incoming-negotiation-event';

export type TIncomingSignalingEvent = IArrayEvent | IClosureEvent | TIncomingNegotiationEvent | IInitEvent | ITerminationEvent;
