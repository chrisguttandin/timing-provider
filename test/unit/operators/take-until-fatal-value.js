import { EMPTY, NEVER, concat, from, mergeMap, of, throwError } from 'rxjs';
import { spy, stub } from 'sinon';
import { marbles } from 'rxjs-marbles';
import { takeUntilFatalValue } from '../../../src/operators/take-until-fatal-value';

describe('takeUntilFatalValue', () => {
    let handleFatalValue;
    let isFatalValue;

    beforeEach(() => {
        handleFatalValue = spy();
        isFatalValue = stub();
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

        it('should not call isFatalValue()', (done) => {
            const destination = EMPTY.pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe({
                complete: () => {
                    expect(isFatalValue).to.have.not.been.called;

                    done();
                }
            });
        });

        it('should not call handleFatalValue()', (done) => {
            const destination = EMPTY.pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe({
                complete: () => {
                    expect(handleFatalValue).to.have.not.been.called;

                    done();
                }
            });
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

        it('should not call isFatalValue()', (done) => {
            const destination = of(error).pipe(
                mergeMap((err) => throwError(() => err)),
                takeUntilFatalValue(isFatalValue, handleFatalValue)
            );

            destination.subscribe({
                error: (err) => {
                    expect(err).to.equal(error);

                    expect(isFatalValue).to.have.not.been.called;

                    done();
                }
            });
        });

        it('should not call handleFatalValue()', (done) => {
            const destination = of(error).pipe(
                mergeMap((err) => throwError(() => err)),
                takeUntilFatalValue(isFatalValue, handleFatalValue)
            );

            destination.subscribe({
                error: (err) => {
                    expect(err).to.equal(error);

                    expect(handleFatalValue).to.have.not.been.called;

                    done();
                }
            });
        });
    });

    describe('with a regular value', () => {
        let regularValue;

        beforeEach(() => {
            regularValue = 'a regular value';

            isFatalValue.returns(false);
        });

        it(
            'should emit an observable with the regular value',
            marbles((helpers) => {
                const destination = helpers.cold('a', { a: regularValue }).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));
                const expected = helpers.cold('a', { a: regularValue });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should call isFatalValue() with the regular value', (done) => {
            const destination = concat(of(regularValue), NEVER).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe(() => {
                expect(isFatalValue).to.have.been.calledTwice;
                expect(isFatalValue).to.have.been.calledWithExactly(regularValue, 0);

                done();
            });
        });

        it('should not call handleFatalValue()', (done) => {
            const destination = concat(of(regularValue), NEVER).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe(() => {
                expect(handleFatalValue).to.have.not.been.called;

                done();
            });
        });

        describe('with a subsequent fatal value', () => {
            let fatalValue;

            beforeEach(() => {
                fatalValue = 'a fatal value';

                isFatalValue.callsFake((value) => value === fatalValue);
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

            it('should call isFatalValue() with the regular and and the fatal value', (done) => {
                const destination = concat(from([regularValue, fatalValue]), NEVER).pipe(
                    takeUntilFatalValue(isFatalValue, handleFatalValue)
                );

                destination.subscribe({
                    complete: () => {
                        expect(isFatalValue).to.have.been.calledThrice;
                        expect(isFatalValue).to.have.been.calledWithExactly(regularValue, 0);
                        expect(isFatalValue).to.have.been.calledWithExactly(fatalValue, 1);

                        done();
                    }
                });
            });

            it('should call handleFatalValue() with the fatal value', (done) => {
                const destination = concat(from([regularValue, fatalValue]), NEVER).pipe(
                    takeUntilFatalValue(isFatalValue, handleFatalValue)
                );

                destination.subscribe({
                    complete: () => {
                        expect(handleFatalValue).to.have.been.calledOnce;
                        expect(handleFatalValue).to.have.been.calledWithExactly(fatalValue);

                        done();
                    }
                });
            });
        });
    });

    describe('with a fatal value', () => {
        let fatalValue;

        beforeEach(() => {
            fatalValue = 'a fatal value';

            isFatalValue.returns(true);
        });

        it(
            'should emit an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('a', { a: fatalValue }).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));
                const expected = helpers.cold('|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should call isFatalValue() with the fatal value', (done) => {
            const destination = concat(of(fatalValue), NEVER).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe({
                complete: () => {
                    expect(isFatalValue).to.have.been.calledOnce;
                    expect(isFatalValue).to.have.been.calledWithExactly(fatalValue, 0);

                    done();
                }
            });
        });

        it('should call handleFatalValue() with the fatal value', (done) => {
            const destination = concat(of(fatalValue), NEVER).pipe(takeUntilFatalValue(isFatalValue, handleFatalValue));

            destination.subscribe({
                complete: () => {
                    expect(handleFatalValue).to.have.been.calledOnce;
                    expect(handleFatalValue).to.have.been.calledWithExactly(fatalValue);

                    done();
                }
            });
        });

        describe('with a subsequent regular value', () => {
            let regularValue;

            beforeEach(() => {
                regularValue = 'a regular value';

                isFatalValue.callsFake((value) => value === fatalValue);
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

            it('should call isFatalValue() with the fatal value', (done) => {
                const destination = concat(from([fatalValue, regularValue]), NEVER).pipe(
                    takeUntilFatalValue(isFatalValue, handleFatalValue)
                );

                destination.subscribe({
                    complete: () => {
                        expect(isFatalValue).to.have.been.calledOnce;
                        expect(isFatalValue).to.have.been.calledWithExactly(fatalValue, 0);

                        done();
                    }
                });
            });

            it('should call handleFatalValue() with the fatal value', (done) => {
                const destination = concat(from([fatalValue, regularValue]), NEVER).pipe(
                    takeUntilFatalValue(isFatalValue, handleFatalValue)
                );

                destination.subscribe({
                    complete: () => {
                        expect(handleFatalValue).to.have.been.calledOnce;
                        expect(handleFatalValue).to.have.been.calledWithExactly(fatalValue);

                        done();
                    }
                });
            });
        });
    });
});
