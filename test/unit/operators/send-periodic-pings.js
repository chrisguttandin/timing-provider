import { BehaviorSubject, EMPTY, from, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendPeriodicPings } from '../../../src/operators/send-periodic-pings';

describe('sendPeriodicPings', () => {
    let localSentTimesSubject;
    let now;
    let send;

    beforeEach(() => {
        localSentTimesSubject = new BehaviorSubject([0, []]);
        now = vi.fn();
        send = vi.fn();
    });

    describe('with no value', () => {
        it('should not emit any value', () => {
            const { promise, reject, resolve } = Promise.withResolvers();

            EMPTY.pipe(sendPeriodicPings(localSentTimesSubject, now)).subscribe({
                complete() {
                    resolve();
                },
                error() {
                    reject(new Error('This should never be called.'));
                },
                next() {
                    reject(new Error('This should never be called.'));
                }
            });

            return promise;
        });

        it('should not call send()', () => {
            const { promise, resolve } = Promise.withResolvers();

            EMPTY.pipe(sendPeriodicPings(localSentTimesSubject, now)).subscribe({
                complete() {
                    expect(send).to.have.not.been.called;

                    resolve();
                }
            });

            return promise;
        });

        it('should not update the stored pings', () => {
            const { promise, resolve } = Promise.withResolvers();

            EMPTY.pipe(sendPeriodicPings(localSentTimesSubject, now)).subscribe({
                complete() {
                    expect(localSentTimesSubject.getValue()).to.deep.equal([0, []]);

                    resolve();
                }
            });

            return promise;
        });
    });

    describe('with one value', () => {
        beforeEach(() => {
            now.mockReturnValue(0.123456789);
        });

        it('should not emit any value', () => {
            const { promise, reject, resolve } = Promise.withResolvers();

            of([, send])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        resolve();
                    },
                    error() {
                        reject(new Error('This should never be called.'));
                    },
                    next() {
                        reject(new Error('This should never be called.'));
                    }
                });

            return promise;
        });

        it('should call send()', () => {
            const { promise, resolve } = Promise.withResolvers();

            of([, send])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        expect(send).to.have.been.calledOnce.and.calledWith({ index: 0, type: 'ping' });

                        resolve();
                    }
                });

            return promise;
        });

        it('should update the stored pings', () => {
            const { promise, resolve } = Promise.withResolvers();

            of([, send])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        expect(localSentTimesSubject.getValue()).to.deep.equal([0, [0.123456789]]);

                        resolve();
                    }
                });

            return promise;
        });
    });

    describe('with two values', () => {
        beforeEach(() => {
            now.mockReturnValueOnce(0.123456789);
            now.mockReturnValueOnce(1.23456789);
        });

        it('should not emit any value', () => {
            const { promise, reject, resolve } = Promise.withResolvers();

            from([
                [, send],
                [, send]
            ])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        resolve();
                    },
                    error() {
                        reject(new Error('This should never be called.'));
                    },
                    next() {
                        reject(new Error('This should never be called.'));
                    }
                });

            return promise;
        });

        it('should call send()', () => {
            const { promise, resolve } = Promise.withResolvers();

            from([
                [, send],
                [, send]
            ])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        expect(send).to.have.been.calledTwice;
                        expect(send.mock.calls[0]).to.deep.equal([{ index: 0, type: 'ping' }]);
                        expect(send.mock.calls[1]).to.deep.equal([{ index: 0, type: 'ping' }]);

                        resolve();
                    }
                });

            return promise;
        });

        it('should update the stored pings', () => {
            const { promise, resolve } = Promise.withResolvers();

            from([
                [, send],
                [, send]
            ])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        expect(localSentTimesSubject.getValue()).to.deep.equal([0, [0.123456789, 1.23456789]]);

                        resolve();
                    }
                });

            return promise;
        });
    });
});
