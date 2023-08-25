import { OperatorFunction, map } from 'rxjs';

/*
 * This will compute the offset with the formula `remoteTime - localTime`. That means a positive offset indicates that `remoteTime` is
 * larger than `localTime` and viceversa.
 */
export const computeOffsetAndRoundTripTime = (): OperatorFunction<readonly [number, number, number, number], [number, number]> =>
    map(([localSentTime, remoteReceivedTime, remoteSentTime, localReceivedTime]) => [
        (remoteReceivedTime + remoteSentTime - localSentTime - localReceivedTime) / 2,
        localReceivedTime - localSentTime + remoteReceivedTime - remoteSentTime
    ]);
