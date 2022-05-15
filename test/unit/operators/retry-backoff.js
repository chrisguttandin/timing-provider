import { concat, iif, mergeMap, of, throwError } from 'rxjs';
import { marbles } from 'rxjs-marbles';
import { retryBackoff } from '../../../src/operators/retry-backoff';

describe('retryBackoff', () => {
    let error;

    beforeEach(() => (error = new Error('a fake error')));

    it(
        'should retry three times before it fails',
        marbles((helpers) => {
            const destination = helpers.cold('#').pipe(retryBackoff());
            const expected = helpers.cold('- 999ms - 3999ms - 8999ms #');

            helpers.expect(destination).toBeObservable(expected);
        })
    );

    it(
        'should reset the counter on success',
        marbles((helpers) => {
            let attempt = 0;

            const destination = of(1).pipe(
                mergeMap((value) =>
                    iif(
                        () => {
                            attempt += 1;

                            return attempt < 5;
                        },
                        concat(
                            of(value),
                            throwError(() => error)
                        ),
                        throwError(() => error)
                    )
                ),
                retryBackoff()
            );
            const expected = helpers.cold('a 999ms a 999ms a 999ms a 13999ms #', { a: 1 }, error);

            helpers.expect(destination).toBeObservable(expected);
        })
    );
});
