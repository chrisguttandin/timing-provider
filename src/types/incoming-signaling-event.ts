import { IClosureEvent, IInitEvent, ITerminationEvent } from '../interfaces';
import { TIncomingNegotiationEvent } from './incoming-negotiation-event';

export type TIncomingSignalingEvent = IClosureEvent | TIncomingNegotiationEvent | IInitEvent | ITerminationEvent;
