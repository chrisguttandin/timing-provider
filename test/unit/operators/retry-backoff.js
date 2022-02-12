import { marbles } from 'rxjs-marbles';
import { retryBackoff } from '../../../src/operators/retry-backoff';

describe('retryBackoff', () => {
    it(
        'should retry three times before it fails',
        marbles((helpers) => {
            const destination = helpers.cold('12345#').pipe(retryBackoff());
            const expected = helpers.cold('12345 1s 12345 4s 12345 9s 12345#');

            helpers.expect(destination).toBeObservable(expected);
        })
    );
});
