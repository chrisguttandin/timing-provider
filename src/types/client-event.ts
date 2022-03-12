import { IAnswerEvent, ICandidateEvent, IOfferEvent, ISummaryEvent } from '../interfaces';

export type TClientEvent = IAnswerEvent | ICandidateEvent | IOfferEvent | ISummaryEvent;
