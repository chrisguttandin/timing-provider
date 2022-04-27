import { ICandidateEvent, IDescriptionEvent, IErrorEvent, ISummaryEvent } from '../interfaces';

export type TClientEvent = ICandidateEvent | IDescriptionEvent | IErrorEvent | ISummaryEvent;
