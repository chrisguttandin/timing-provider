import { TExtendedTimingStateVector } from '../types';

export interface IUpdateEvent {
    message: TExtendedTimingStateVector;

    type: 'update';
}
