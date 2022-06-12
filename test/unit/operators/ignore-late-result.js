import { finalize } from 'rxjs';
import { ignoreLateResult } from '../../../src/operators/ignore-late-result';
import { spy } from 'sinon';

describe('ignoreLateResult', () => {
    let complete;
    let error;
    let next;

    beforeEach(() => {
        complete = spy();
        error = spy();
        next = spy();
    });

    describe('with a promise that resolves a value', () => {
        let promise;
        let value;

        beforeEach(() => {
            value = 'a fake value';
            promise = Promise.resolve(value);
        });

        describe('with a subscription that is not yet completed when the promise settles', () => {
            it('should emit the value', (done) => {
                ignoreLateResult(promise)
                    .pipe(
                        finalize(() => {
                            expect(complete).to.have.been.calledOnceWithExactly();
                            expect(error).to.have.not.been.called;
                            expect(next).to.have.been.calledOnceWithExactly(value);

                            done();
                        })
                    )
                    .subscribe({
                        complete,
                        error,
                        next
                    });
            });
        });

        describe('with a subscription that is already completed when the promise settles', () => {
            it('should not emit or throw anything', (done) => {
                ignoreLateResult(promise)
                    .pipe(
                        finalize(() => {
                            expect(complete).to.have.not.been.called;
                            expect(error).to.have.not.been.called;
                            expect(next).to.have.not.been.called;

                            done();
                        })
                    )
                    .subscribe({
                        complete,
                        error,
                        next
                    })
                    .unsubscribe();
            });
        });
    });

    describe('with a promise that rejects an error', () => {
        let err;
        let promise;

        beforeEach(() => {
            err = new Error('a fake error');
            promise = Promise.reject(err);
        });

        describe('with a subscription that is not yet completed when the promise settles', () => {
            it('should throw the error', (done) => {
                ignoreLateResult(promise)
                    .pipe(
                        finalize(() => {
                            expect(complete).to.have.not.been.called;
                            expect(error).to.have.been.calledOnceWithExactly(err);
                            expect(next).to.have.not.been.called;

                            done();
                        })
                    )
                    .subscribe({
                        complete,
                        error,
                        next
                    });
            });
        });

        describe('with a subscription that is already completed when the promise settles', () => {
            it('should not emit or throw anything', (done) => {
                ignoreLateResult(promise)
                    .pipe(
                        finalize(() => {
                            expect(complete).to.have.not.been.called;
                            expect(error).to.have.not.been.called;
                            expect(next).to.have.not.been.called;

                            done();
                        })
                    )
                    .subscribe({
                        complete,
                        error,
                        next
                    })
                    .unsubscribe();
            });
        });
    });
});
