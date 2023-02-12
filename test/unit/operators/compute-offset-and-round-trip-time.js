import { computeOffsetAndRoundTripTime } from '../../../src/operators/compute-offset-and-round-trip-time';
import { marbles } from 'rxjs-marbles';

describe('computeOffsetAndRoundTripTime', () => {
    let localReceivedTime;
    let localSentTime;
    let remoteReceivedTime;
    let remoteSentTime;

    beforeEach(() => {
        localReceivedTime = 4;
        localSentTime = 1;
        remoteReceivedTime = 12;
        remoteSentTime = 13;
    });

    it(
        'should compute the expected offset',
        marbles((helpers) => {
            const destination = helpers
                .cold('a|', { a: [localSentTime, remoteReceivedTime, remoteSentTime, localReceivedTime] })
                .pipe(computeOffsetAndRoundTripTime());
            const expected = helpers.cold('a|', { a: [10, 2] });

            helpers.expect(destination).toBeObservable(expected);
        })
    );
});
