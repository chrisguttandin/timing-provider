import { OperatorFunction } from 'rxjs';
import { map } from 'rxjs/operators';

/*
 * This will compute the offset with the formula `remoteTime - localTime`. That means a positive offset indicates that `remoteTime` is
 * larger than `localTime` and viceversa.
 */
export const computeOffset = (): OperatorFunction<[number, readonly [number, number]], number> =>
    map(([pingTime, [pongTime, eventTime]]) => pongTime - (pingTime + eventTime) / 2);
