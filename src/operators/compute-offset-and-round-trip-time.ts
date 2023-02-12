import { OperatorFunction, map } from 'rxjs';

/*
 * This will compute the offset with the formula `remoteTime - localTime`. That means a positive offset indicates that `remoteTime` is
 * larger than `localTime` and viceversa.
 */
export const computeOffsetAndRoundTripTime = (): OperatorFunction<[number, readonly[number, number, number]], [number, number]> =>
    map(([localSendTime, [remoteReceivedTime, remoteSendTime, localReceivedTime]]) => [
        remoteReceivedTime - (localSendTime + remoteReceivedTime - remoteSendTime + localReceivedTime) / 2,
        localReceivedTime - localSendTime + remoteReceivedTime - remoteSendTime
    ]);
