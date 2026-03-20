import { EMPTY, NEVER, concat, from, mergeMap, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { marbles } from 'rxjs-marbles';
import { takeUntilFatalValue } from '../../../src/operators/take-until-fatal-value';

describe('takeUntilFatalValue', () => {
    let handleFatalValue;
    let isFatalValue;

    beforeEach(() => {
        handleFatalValue = vi.fn();
        isFatalValue = vi.fn();
    });

    describe('without any value', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));
                const expected = helpers.cold('|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should not call isFatalValue()', () => {
            const { promise, resolve } = Promise.withResolvers();
            const destination = EMPTY.pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe({
                complete: () => {
                    expect(isFatalValue).to.have.not.been.called;

                    resolve();
                }
            });

            return promise;
        });

        it('should not call handleFatalValue()', () => {
            const { promise, resolve } = Promise.withResolvers();
            const destination = EMPTY.pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe({
                complete: () => {
                    expect(handleFatalValue).to.have.not.been.called;

                    resolve();
                }
            });

            return promise;
        });
    });

    describe('with an error', () => {
        let error;

        beforeEach(() => (error = new Error('a fake error')));

        it(
            'should mirror an error observable',
            marbles((helpers) => {
                const destination = helpers.cold('#', null, error).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));
                const expected = helpers.cold('#', null, error);

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should not call isFatalValue()', () => {
            const { promise, resolve } = Promise.withResolvers();
            const destination = of(error).pipe(
                mergeMap((err) => throwError(() => err)),
                takeUntilFatalValue(isFatalValue, handleFatalValue)
            );

            destination.subscribe({
                error: (err) => {
                    expect(err).to.equal(error);

                    expect(isFatalValue).to.have.not.been.called;

                    resolve();
                }
            });

            return promise;
        });

        it('should not call handleFatalValue()', () => {
            const { promise, resolve } = Promise.withResolvers();
            const destination = of(error).pipe(
                mergeMap((err) => throwError(() => err)),
                takeUntilFatalValue(isFatalValue, handleFatalValue)
            );

            destination.subscribe({
                error: (err) => {
                    expect(err).to.equal(error);

                    expect(handleFatalValue).to.have.not.been.called;

                    resolve();
                }
            });

            return promise;
        });
    });

    describe('with a regular value', () => {
        let regularValue;

        beforeEach(() => {
            regularValue = 'a regular value';

            isFatalValue.mockReturnValue(false);
        });

        it(
            'should emit an observable with the regular value',
            marbles((helpers) => {
                const destination = helpers.cold('a', { a: regularValue }).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));
                const expected = helpers.cold('a', { a: regularValue });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should call isFatalValue() with the regular value', () => {
            const { promise, resolve } = Promise.withResolvers();
            const destination = concat(of(regularValue), NEVER).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe(() => {
                expect(isFatalValue).to.have.been.calledTwice;
                expect(isFatalValue).to.have.been.calledWith(regularValue, 0);

                resolve();
            });

            return promise;
        });

        it('should not call handleFatalValue()', () => {
            const { promise, resolve } = Promise.withResolvers();
            const destination = concat(of(regularValue), NEVER).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe(() => {
                expect(handleFatalValue).to.have.not.been.called;

                resolve();
            });

            return promise;
        });

        describe('with a subsequent fatal value', () => {
            let fatalValue;

            beforeEach(() => {
                fatalValue = 'a fatal value';

                isFatalValue.mockImplementation((value) => value === fatalValue);
            });

            it(
                'should emit an observable with the regular value',
                marbles((helpers) => {
                    const destination = helpers
                        .cold('ab', { a: regularValue, b: fatalValue })
                        .pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));
                    const expected = helpers.cold('a|', { a: regularValue });

                    helpers.expect(destination).toBeObservable(expected);
                })
            );

            it('should call isFatalValue() with the regular and and the fatal value', () => {
                const { promise, resolve } = Promise.withResolvers();
                const destination = concat(from([regularValue, fatalValue]), NEVER).pipe(
                    takeUntilFatalValue(isFatalValue, handleFatalValue)
                );

                destination.subscribe({
                    complete: () => {
                        expect(isFatalValue).to.have.been.calledThrice;
                        expect(isFatalValue).to.have.been.calledWith(regularValue, 0);
                        expect(isFatalValue).to.have.been.calledWith(fatalValue, 1);

                        resolve();
                    }
                });

                return promise;
            });

            it('should call handleFatalValue() with the fatal value', () => {
                const { promise, resolve } = Promise.withResolvers();
                const destination = concat(from([regularValue, fatalValue]), NEVER).pipe(
                    takeUntilFatalValue(isFatalValue, handleFatalValue)
                );

                destination.subscribe({
                    complete: () => {
                        expect(handleFatalValue).to.have.been.calledOnce;
                        expect(handleFatalValue).to.have.been.calledWith(fatalValue);

                        resolve();
                    }
                });

                return promise;
            });
        });
    });

    describe('with a fatal value', () => {
        let fatalValue;

        beforeEach(() => {
            fatalValue = 'a fatal value';

            isFatalValue.mockReturnValue(true);
        });

        it(
            'should emit an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('a', { a: fatalValue }).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));
                const expected = helpers.cold('|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should call isFatalValue() with the fatal value', () => {
            const { promise, resolve } = Promise.withResolvers();
            const destination = concat(of(fatalValue), NEVER).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe({
                complete: () => {
                    expect(isFatalValue).to.have.been.calledOnce;
                    expect(isFatalValue).to.have.been.calledWith(fatalValue, 0);

                    resolve();
                }
            });

            return promise;
        });

        it('should call handleFatalValue() with the fatal value', () => {
            const { promise, resolve } = Promise.withResolvers();
            const destination = concat(of(fatalValue), NEVER).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe({
                complete: () => {
                    expect(handleFatalValue).to.have.been.calledOnce;
                    expect(handleFatalValue).to.have.been.calledWith(fatalValue);

                    resolve();
                }
            });

            return promise;
        });

        describe('with a subsequent regular value', () => {
            let regularValue;

            beforeEach(() => {
                regularValue = 'a regular value';

                isFatalValue.mockImplementation((value) => value === fatalValue);
            });

            it(
                'should emit an empty observable',
                marbles((helpers) => {
                    const destination = helpers
                        .cold('ab', { a: fatalValue, b: regularValue })
                        .pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));
                    const expected = helpers.cold('|');

                    helpers.expect(destination).toBeObservable(expected);
                })
            );

            it('should call isFatalValue() with the fatal value', () => {
                const { promise, resolve } = Promise.withResolvers();
                const destination = concat(from([fatalValue, regularValue]), NEVER).pipe(
                    takeUntilFatalValue(isFatalValue, handleFatalValue)
                );

                destination.subscribe({
                    complete: () => {
                        expect(isFatalValue).to.have.been.calledOnce;
                        expect(isFatalValue).to.have.been.calledWith(fatalValue, 0);

                        resolve();
                    }
                });

                return promise;
            });

            it('should call handleFatalValue() with the fatal value', () => {
                const { promise, resolve } = Promise.withResolvers();
                const destination = concat(from([fatalValue, regularValue]), NEVER).pipe(
                    takeUntilFatalValue(isFatalValue, handleFatalValue)
                );

                destination.subscribe({
                    complete: () => {
                        expect(handleFatalValue).to.have.been.calledOnce;
                        expect(handleFatalValue).to.have.been.calledWith(fatalValue);

                        resolve();
                    }
                });

                return promise;
            });
        });
    });
});
