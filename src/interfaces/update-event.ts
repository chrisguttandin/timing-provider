import { TExtendedTimingStateVector } from '../types';

export interface IUpdateEvent {
    message: { [P in keyof TExtendedTimingStateVector]: TExtendedTimingStateVector[P] };

    timestamp?: number;

    type: 'update';
}
