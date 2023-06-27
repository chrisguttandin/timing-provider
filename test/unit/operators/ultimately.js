import { EMPTY, of, throwError } from 'rxjs';
import { marbles } from 'rxjs-marbles';
import { spy } from 'sinon';
import { ultimately } from '../../../src/operators/ultimately';

describe('ultimately', () => {
    let callback;

    beforeEach(() => {
        callback = spy();
    });

    describe('without any value', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(ultimately(callback));
                const expected = helpers.cold('|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should call the callback', (done) => {
            EMPTY.pipe(ultimately(callback)).subscribe({
                complete() {
                    expect(callback).to.have.been.calledOnceWithExactly();

                    done();
                }
            });
        });
    });

    describe('with an error', () => {
        it(
            'should mirror an error observable',
            marbles((helpers) => {
                const err = new Error('a fake error');
                const destination = helpers.cold('#', null, err).pipe(ultimately(callback));
                const expected = helpers.cold('#', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should call the callback', (done) => {
            throwError(() => new Error('a fake error'))
                .pipe(ultimately(callback))
                .subscribe({
                    error() {
                        expect(callback).to.have.been.calledOnceWithExactly();

                        done();
                    }
                });
        });
    });

    describe('with a single value', () => {
        let value;

        beforeEach(() => {
            value = 'a fake value';
        });

        it(
            'should emit the same value',
            marbles((helpers) => {
                const destination = helpers.cold('a|', { a: value }).pipe(ultimately(callback));
                const expected = helpers.cold('a|', { a: value });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should call the callback', (done) => {
            of(value)
                .pipe(ultimately(callback))
                .subscribe({
                    complete() {
                        expect(callback).to.have.been.calledOnceWithExactly();

                        done();
                    }
                });
        });
    });
});
