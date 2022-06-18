import { ICandidateEvent, ICheckEvent, IDescriptionEvent, IErrorEvent, ISummaryEvent } from '../interfaces';

export type TOutgoingSignalingEvent = ICandidateEvent | ICheckEvent | IDescriptionEvent | IErrorEvent | ISummaryEvent;
