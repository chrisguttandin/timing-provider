import { computeOffset } from '../../../src/operators/compute-offset';
import { marbles } from 'rxjs-marbles';

describe('computeOffset', () => {
    let localReceivedTime;
    let localSendTime;
    let remoteReceivedTime;
    let remoteSendTime;

    beforeEach(() => {
        localReceivedTime = 4;
        localSendTime = 1;
        remoteReceivedTime = 12;
        remoteSendTime = 13;
    });

    it(
        'should compute the expected offset',
        marbles((helpers) => {
            const destination = helpers
                .cold('a|', { a: [localSendTime, [remoteReceivedTime, remoteSendTime, localReceivedTime]] })
                .pipe(computeOffset());
            const expected = helpers.cold('a|', { a: 10 });

            helpers.expect(destination).toBeObservable(expected);
        })
    );
});
