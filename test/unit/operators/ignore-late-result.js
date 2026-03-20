import { beforeEach, describe, expect, it, vi } from 'vitest';
import { finalize } from 'rxjs';
import { ignoreLateResult } from '../../../src/operators/ignore-late-result';

describe('ignoreLateResult', () => {
    let complete;
    let error;
    let next;

    beforeEach(() => {
        complete = vi.fn();
        error = vi.fn();
        next = vi.fn();
    });

    describe('with a promise that resolves a value', () => {
        let value;

        beforeEach(() => {
            value = 'a fake value';
        });

        describe('with a subscription that is not yet completed when the promise settles', () => {
            it('should emit the value', () => {
                const { promise, resolve } = Promise.withResolvers();

                ignoreLateResult(Promise.resolve(value))
                    .pipe(
                        finalize(() => {
                            expect(complete).to.have.been.calledOnceWith();
                            expect(error).to.have.not.been.called;
                            expect(next).to.have.been.calledOnceWith(value);

                            resolve();
                        })
                    )
                    .subscribe({
                        complete,
                        error,
                        next
                    });

                return promise;
            });
        });

        describe('with a subscription that is already completed when the promise settles', () => {
            it('should not emit or throw anything', () => {
                const { promise, resolve } = Promise.withResolvers();

                ignoreLateResult(Promise.resolve(value))
                    .pipe(
                        finalize(() => {
                            expect(complete).to.have.not.been.called;
                            expect(error).to.have.not.been.called;
                            expect(next).to.have.not.been.called;

                            resolve();
                        })
                    )
                    .subscribe({
                        complete,
                        error,
                        next
                    })
                    .unsubscribe();

                return promise;
            });
        });
    });

    describe('with a promise that rejects an error', () => {
        let err;

        beforeEach(() => {
            err = new Error('a fake error');
        });

        describe('with a subscription that is not yet completed when the promise settles', () => {
            it('should throw the error', () => {
                const { promise, resolve } = Promise.withResolvers();

                ignoreLateResult(Promise.reject(err))
                    .pipe(
                        finalize(() => {
                            expect(complete).to.have.not.been.called;
                            expect(error).to.have.been.calledOnceWith(err);
                            expect(next).to.have.not.been.called;

                            resolve();
                        })
                    )
                    .subscribe({
                        complete,
                        error,
                        next
                    });

                return promise;
            });
        });

        describe('with a subscription that is already completed when the promise settles', () => {
            it('should not emit or throw anything', () => {
                const { promise, resolve } = Promise.withResolvers();

                ignoreLateResult(Promise.reject(err))
                    .pipe(
                        finalize(() => {
                            expect(complete).to.have.not.been.called;
                            expect(error).to.have.not.been.called;
                            expect(next).to.have.not.been.called;

                            resolve();
                        })
                    )
                    .subscribe({
                        complete,
                        error,
                        next
                    })
                    .unsubscribe();

                return promise;
            });
        });
    });
});
