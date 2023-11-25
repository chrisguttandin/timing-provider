import { spy, stub } from 'sinon';
import { echo } from '../../../src/operators/echo';
import { marbles } from 'rxjs-marbles';

describe('echo', () => {
    let callback;
    let predicate;

    beforeEach(() => {
        callback = spy();
        predicate = stub();
    });

    describe('without any value', () => {
        describe('with a timer that emits immediately', () => {
            let createTimer;

            beforeEach(() => (createTimer = (helpers) => helpers.cold('a|', { a: 0 })));

            it(
                'should mirror an empty observable',
                marbles((helpers) => {
                    const timer = createTimer(helpers);
                    const destination = helpers.cold('|').pipe(echo(callback, predicate, timer));
                    const expected = helpers.cold('|');

                    helpers.expect(destination).toBeObservable(expected);
                })
            );

            it(
                'should call the predicate',
                marbles((helpers) => {
                    const timer = createTimer(helpers);

                    helpers
                        .cold('|')
                        .pipe(echo(callback, predicate, timer))
                        .subscribe({
                            complete: () => {
                                expect(predicate).to.have.been.calledOnceWithExactly(0, 0);
                            }
                        });
                })
            );

            describe('with a predicate that returns true', () => {
                beforeEach(() => predicate.returns(true));

                it(
                    'should call the callback',
                    marbles((helpers) => {
                        const timer = createTimer(helpers);

                        helpers
                            .cold('|')
                            .pipe(echo(callback, predicate, timer))
                            .subscribe({
                                complete: () => {
                                    expect(callback).to.have.been.calledOnceWithExactly(0);
                                }
                            });
                    })
                );
            });

            describe('with a predicate that returns false', () => {
                beforeEach(() => predicate.returns(false));

                it(
                    'should not call the callback',
                    marbles((helpers) => {
                        const timer = createTimer(helpers);

                        helpers
                            .cold('|')
                            .pipe(echo(callback, predicate, timer))
                            .subscribe({
                                complete: () => {
                                    expect(callback).to.have.not.been.called;
                                }
                            });
                    })
                );
            });
        });

        describe('with a timer that delays the emission', () => {
            let createTimer;

            beforeEach(() => (createTimer = (helpers) => helpers.cold('-a|', { a: 0 })));

            it(
                'should mirror an empty observable',
                marbles((helpers) => {
                    const timer = createTimer(helpers);
                    const destination = helpers.cold('|').pipe(echo(callback, predicate, timer));
                    const expected = helpers.cold('|');

                    helpers.expect(destination).toBeObservable(expected);
                })
            );

            it(
                'should not call the predicate',
                marbles((helpers) => {
                    const timer = createTimer(helpers);

                    helpers
                        .cold('|')
                        .pipe(echo(callback, predicate, timer))
                        .subscribe({
                            complete: () => {
                                expect(predicate).to.have.not.been.called;
                            }
                        });
                })
            );

            it(
                'should not call the callback',
                marbles((helpers) => {
                    const timer = createTimer(helpers);

                    helpers
                        .cold('|')
                        .pipe(echo(callback, predicate, timer))
                        .subscribe({
                            complete: () => {
                                expect(predicate).to.have.not.been.called;
                            }
                        });
                })
            );
        });
    });

    describe('with an error', () => {
        it(
            'should mirror an error observable',
            marbles((helpers) => {
                const err = new Error('a fake error');
                const timer = helpers.cold('a|');
                const destination = helpers.cold('#', null, err).pipe(echo(callback, predicate, timer));
                const expected = helpers.cold('#', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single value', () => {
        let value;

        beforeEach(() => (value = 'a fake value'));

        describe('with a timer that emits immediately', () => {
            let createTimer;

            beforeEach(() => (createTimer = (helpers) => helpers.cold('a|', { a: 0 })));

            it(
                'should emit the same value',
                marbles((helpers) => {
                    const timer = createTimer(helpers);
                    const destination = helpers.cold('a|', { a: value }).pipe(echo(callback, predicate, timer));
                    const expected = helpers.cold('a|', { a: value });

                    helpers.expect(destination).toBeObservable(expected);
                })
            );

            it(
                'should call the predicate',
                marbles((helpers) => {
                    const timer = createTimer(helpers);

                    helpers
                        .cold('a|', { a: value })
                        .pipe(echo(callback, predicate, timer))
                        .subscribe({
                            complete: () => {
                                expect(predicate).to.have.been.calledTwice.and.calledWithExactly(0, 0);
                            }
                        });
                })
            );

            describe('with a predicate that returns true', () => {
                beforeEach(() => predicate.returns(true));

                it(
                    'should call the callback',
                    marbles((helpers) => {
                        const timer = createTimer(helpers);

                        helpers
                            .cold('a|', { a: value })
                            .pipe(echo(callback, predicate, timer))
                            .subscribe({
                                complete: () => {
                                    expect(callback).to.have.been.calledTwice.and.calledWithExactly(0);
                                }
                            });
                    })
                );
            });

            describe('with a predicate that returns false', () => {
                beforeEach(() => predicate.returns(false));

                it(
                    'should not call the callback',
                    marbles((helpers) => {
                        const timer = createTimer(helpers);

                        helpers
                            .cold('a|', { a: value })
                            .pipe(echo(callback, predicate, timer))
                            .subscribe({
                                complete: () => {
                                    expect(callback).to.have.not.been.called;
                                }
                            });
                    })
                );
            });
        });

        describe('with a timer that delays the emission', () => {
            let createTimer;

            beforeEach(() => (createTimer = (helpers) => helpers.cold('-a|', { a: 0 })));

            it(
                'should emit the same value',
                marbles((helpers) => {
                    const timer = createTimer(helpers);
                    const destination = helpers.cold('a|', { a: value }).pipe(echo(callback, predicate, timer));
                    const expected = helpers.cold('a|', { a: value });

                    helpers.expect(destination).toBeObservable(expected);
                })
            );

            it(
                'should not call the predicate',
                marbles((helpers) => {
                    const timer = createTimer(helpers);

                    helpers
                        .cold('a|', { a: value })
                        .pipe(echo(callback, predicate, timer))
                        .subscribe({
                            complete: () => {
                                expect(predicate).to.have.not.been.called;
                            }
                        });
                })
            );

            it(
                'should not call the callback',
                marbles((helpers) => {
                    const timer = createTimer(helpers);

                    helpers
                        .cold('a|', { a: value })
                        .pipe(echo(callback, predicate, timer))
                        .subscribe({
                            complete: () => {
                                expect(predicate).to.have.not.been.called;
                            }
                        });
                })
            );
        });
    });
});
