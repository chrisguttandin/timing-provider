import { ICheckEvent } from '../interfaces';
import { TClientEvent } from './client-event';

export type TOutgoingSignalingEvent = ICheckEvent | TClientEvent;
