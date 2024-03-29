import { EMPTY, NEVER, Subject, concat, from, interval, mergeMap, of, takeUntil } from 'rxjs';
import { demultiplexMessages } from '../../../src/operators/demultiplex-messages';
import { marbles } from 'rxjs-marbles';

describe('demultiplexMessages', () => {
    let clientId;
    let getClientId;

    beforeEach(() => {
        clientId = 'a fake client id';
        getClientId = () => clientId;
    });

    describe('without any event', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('|').pipe(demultiplexMessages(getClientId, timer));
                const expected = helpers.cold('|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with an error', () => {
        it(
            'should mirror an error observable',
            marbles((helpers) => {
                const err = new Error('a fake error');
                const timer = helpers.cold('a|');
                const destination = helpers.cold('#', null, err).pipe(demultiplexMessages(getClientId, timer));
                const expected = helpers.cold('#', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single request event', () => {
        let event;

        beforeEach(
            () =>
                (event = {
                    client: {
                        id: clientId
                    },
                    type: 'request'
                })
        );

        it(
            'should emit an observable with the client id and an observable',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(getClientId, timer));
                const subject = new Subject();
                const expected = helpers.cold('a|', { a: [clientId, false, subject.asObservable()] });

                subject.next(event);
                subject.complete();

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it(
            'should emit an observable with an observable that emits the event',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(
                    demultiplexMessages(getClientId, timer),
                    mergeMap(([, , observable]) => observable)
                );
                const expected = helpers.hot('a|', { a: event });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should complete the observable when unsubscribing', (done) => {
            concat(of(event), NEVER)
                .pipe(demultiplexMessages(getClientId, EMPTY), takeUntil(interval(1)))
                .subscribe({
                    next: ([, , observable]) => {
                        observable.subscribe({
                            complete: done
                        });
                    }
                });
        });

        describe('with a subsequent termination event', () => {
            it('should complete the observable', (done) => {
                concat(
                    from([
                        event,
                        {
                            client: {
                                id: clientId
                            },
                            type: 'termination'
                        }
                    ]),
                    NEVER
                )
                    .pipe(demultiplexMessages(getClientId, EMPTY))
                    .subscribe({
                        next: ([, , observable]) => {
                            observable.subscribe({
                                complete: done
                            });
                        }
                    });
            });
        });
    });

    describe('with a single candidate event', () => {
        let event;

        beforeEach(
            () =>
                (event = {
                    client: {
                        id: clientId
                    },
                    type: 'candidate',
                    version: 17
                })
        );

        it(
            'should emit an observable with the client id and an observable',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(getClientId, timer));
                const subject = new Subject();
                const expected = helpers.cold('a|', { a: [clientId, false, subject.asObservable()] });

                subject.next(event);
                subject.complete();

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it(
            'should emit an observable with an observable that emits the event',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(
                    demultiplexMessages(getClientId, timer),
                    mergeMap(([, , observable]) => observable)
                );
                const expected = helpers.hot('a|', { a: event });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should complete the observable when unsubscribing', (done) => {
            concat(of(event), NEVER)
                .pipe(demultiplexMessages(getClientId, EMPTY), takeUntil(interval(1)))
                .subscribe({
                    next: ([, , observable]) => {
                        observable.subscribe({
                            complete: done
                        });
                    }
                });
        });

        describe('with a subsequent termination event', () => {
            it('should complete the observable', (done) => {
                concat(
                    from([
                        event,
                        {
                            client: {
                                id: clientId
                            },
                            type: 'termination'
                        }
                    ]),
                    NEVER
                )
                    .pipe(demultiplexMessages(getClientId, EMPTY))
                    .subscribe({
                        next: ([, , observable]) => {
                            observable.subscribe({
                                complete: done
                            });
                        }
                    });
            });
        });
    });

    describe('with a single description event', () => {
        let event;

        beforeEach(
            () =>
                (event = {
                    client: {
                        id: clientId
                    },
                    type: 'description',
                    version: 18
                })
        );

        it(
            'should emit an observable with the client id and an observable',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(getClientId, timer));
                const subject = new Subject();
                const expected = helpers.cold('a|', { a: [clientId, false, subject.asObservable()] });

                subject.next(event);
                subject.complete();

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it(
            'should emit an observable with an observable that emits the event',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(
                    demultiplexMessages(getClientId, timer),
                    mergeMap(([, , observable]) => observable)
                );
                const expected = helpers.hot('a|', { a: event });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should complete the observable when unsubscribing', (done) => {
            concat(of(event), NEVER)
                .pipe(demultiplexMessages(getClientId, EMPTY), takeUntil(interval(1)))
                .subscribe({
                    next: ([, , observable]) => {
                        observable.subscribe({
                            complete: done
                        });
                    }
                });
        });

        describe('with a subsequent termination event', () => {
            it('should complete the observable', (done) => {
                concat(
                    from([
                        event,
                        {
                            client: {
                                id: clientId
                            },
                            type: 'termination'
                        }
                    ]),
                    NEVER
                )
                    .pipe(demultiplexMessages(getClientId, EMPTY))
                    .subscribe({
                        next: ([, , observable]) => {
                            observable.subscribe({
                                complete: done
                            });
                        }
                    });
            });
        });
    });

    describe('with a single summary event', () => {
        let event;

        beforeEach(
            () =>
                (event = {
                    client: {
                        id: clientId
                    },
                    type: 'summary',
                    version: 19
                })
        );

        it(
            'should emit an observable with the client id and an observable',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(getClientId, timer));
                const subject = new Subject();
                const expected = helpers.cold('a|', { a: [clientId, false, subject.asObservable()] });

                subject.next(event);
                subject.complete();

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it(
            'should emit an observable with an observable that emits the event',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(
                    demultiplexMessages(getClientId, timer),
                    mergeMap(([, , observable]) => observable)
                );
                const expected = helpers.hot('a|', { a: event });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should complete the observable when unsubscribing', (done) => {
            concat(of(event), NEVER)
                .pipe(demultiplexMessages(getClientId, EMPTY), takeUntil(interval(1)))
                .subscribe({
                    next: ([, , observable]) => {
                        observable.subscribe({
                            complete: done
                        });
                    }
                });
        });

        describe('with a subsequent termination event', () => {
            it('should complete the observable', (done) => {
                concat(
                    from([
                        event,
                        {
                            client: {
                                id: clientId
                            },
                            type: 'termination'
                        }
                    ]),
                    NEVER
                )
                    .pipe(demultiplexMessages(getClientId, EMPTY))
                    .subscribe({
                        next: ([, , observable]) => {
                            observable.subscribe({
                                complete: done
                            });
                        }
                    });
            });
        });
    });

    describe('with a single termination event', () => {
        let event;

        beforeEach(
            () =>
                (event = {
                    client: {
                        id: clientId
                    },
                    type: 'termination'
                })
        );

        it(
            'should not emit any observable',
            marbles((helpers) => {
                const timer = helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(getClientId, timer));
                const expected = helpers.cold('-|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });
});
