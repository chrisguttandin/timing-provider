import { computeOffset } from '../../../src/operators/compute-offset';
import { marbles } from 'rxjs-marbles';

describe('computeOffset', () => {
    let pingTime;
    let pongTime;
    let eventTime;

    beforeEach(() => {
        pingTime = 1;
        pongTime = 12;
        eventTime = 3;
    });

    it(
        'should compute the expected offset',
        marbles((helpers) => {
            const destination = helpers.cold('a|', { a: [pingTime, [pongTime, eventTime]] }).pipe(computeOffset());
            const expected = helpers.cold('a|', { a: 10 });

            helpers.expect(destination).toBeObservable(expected);
        })
    );
});
