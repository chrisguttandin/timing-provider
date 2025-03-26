import { ICandidateEvent, ICheckEvent, IDescriptionEvent, IErrorEvent, IIceCandidateErrorEvent, ISummaryEvent } from '../interfaces';

export type TOutgoingSignalingEvent =
    | ICandidateEvent
    | ICheckEvent
    | IDescriptionEvent
    | IErrorEvent
    | IIceCandidateErrorEvent
    | ISummaryEvent;
