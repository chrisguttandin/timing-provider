import { ICandidateEvent, IDescriptionEvent, IErrorEvent, INoticeEvent, IRequestEvent, ISummaryEvent } from '../interfaces';

export type TIncomingNegotiationEvent = ICandidateEvent | IDescriptionEvent | IErrorEvent | INoticeEvent | IRequestEvent | ISummaryEvent;
