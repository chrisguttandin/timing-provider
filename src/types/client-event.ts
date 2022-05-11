import { ICandidateEvent, IDescriptionEvent, IErrorEvent, INoticeEvent, ISummaryEvent } from '../interfaces';

export type TClientEvent = ICandidateEvent | IDescriptionEvent | IErrorEvent | INoticeEvent | ISummaryEvent;
