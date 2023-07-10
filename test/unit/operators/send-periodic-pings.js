import { BehaviorSubject, EMPTY, from, of } from 'rxjs';
import { spy, stub } from 'sinon';
import { sendPeriodicPings } from '../../../src/operators/send-periodic-pings';

describe('sendPeriodicPings', () => {
    let localSentTimesSubject;
    let now;
    let send;

    beforeEach(() => {
        localSentTimesSubject = new BehaviorSubject([0, []]);
        now = stub();
        send = spy();
    });

    describe('with no value', () => {
        it('should not emit any value', (done) => {
            EMPTY.pipe(sendPeriodicPings(localSentTimesSubject, now)).subscribe({
                complete() {
                    done();
                },
                error() {
                    done(new Error('This should never be called.'));
                },
                next() {
                    done(new Error('This should never be called.'));
                }
            });
        });

        it('should not call send()', (done) => {
            EMPTY.pipe(sendPeriodicPings(localSentTimesSubject, now)).subscribe({
                complete() {
                    expect(send).to.have.not.been.called;

                    done();
                }
            });
        });

        it('should not update the stored pings', (done) => {
            EMPTY.pipe(sendPeriodicPings(localSentTimesSubject, now)).subscribe({
                complete() {
                    expect(localSentTimesSubject.getValue()).to.deep.equal([0, []]);

                    done();
                }
            });
        });
    });

    describe('with one value', () => {
        beforeEach(() => {
            now.returns(0.123456789);
        });

        it('should not emit any value', (done) => {
            of([, send])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        done();
                    },
                    error() {
                        done(new Error('This should never be called.'));
                    },
                    next() {
                        done(new Error('This should never be called.'));
                    }
                });
        });

        it('should call send()', (done) => {
            of([, send])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        expect(send).to.have.been.calledOnce.and.calledWithExactly({ index: 0, type: 'ping' });

                        done();
                    }
                });
        });

        it('should update the stored pings', (done) => {
            of([, send])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        expect(localSentTimesSubject.getValue()).to.deep.equal([0, [0.123456789]]);

                        done();
                    }
                });
        });
    });

    describe('with two values', () => {
        beforeEach(() => {
            now.onFirstCall().returns(0.123456789).onSecondCall().returns(1.23456789);
        });

        it('should not emit any value', (done) => {
            from([
                [, send],
                [, send]
            ])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        done();
                    },
                    error() {
                        done(new Error('This should never be called.'));
                    },
                    next() {
                        done(new Error('This should never be called.'));
                    }
                });
        });

        it('should call send()', (done) => {
            from([
                [, send],
                [, send]
            ])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        expect(send).to.have.been.calledTwice;
                        expect(send.getCall(0)).to.have.been.calledWithExactly({ index: 0, type: 'ping' });
                        expect(send.getCall(1)).to.have.been.calledWithExactly({ index: 0, type: 'ping' });

                        done();
                    }
                });
        });

        it('should update the stored pings', (done) => {
            from([
                [, send],
                [, send]
            ])
                .pipe(sendPeriodicPings(localSentTimesSubject, now))
                .subscribe({
                    complete() {
                        expect(localSentTimesSubject.getValue()).to.deep.equal([0, [0.123456789, 1.23456789]]);

                        done();
                    }
                });
        });
    });
});
