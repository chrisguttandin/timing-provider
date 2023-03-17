import { BehaviorSubject, NEVER, Subject, takeUntil } from 'rxjs';
import { sendPeriodicPings } from '../../../src/operators/send-periodic-pings';
import { stub } from 'sinon';

describe('sendPeriodicPings', () => {
    let localSentTimesSubject;
    let now;
    let sendPing;
    let triggerSubject;

    beforeEach(() => {
        localSentTimesSubject = new BehaviorSubject([0, []]);
        now = stub();
        sendPing = stub();
        triggerSubject = new Subject();
    });

    describe('with one trigger', () => {
        beforeEach(() => {
            now.returns(0.123456789);
            sendPing.callsFake(() => setTimeout(() => triggerSubject.next(null)));
        });

        it('should not emit any value', (done) => {
            NEVER.pipe(sendPeriodicPings(localSentTimesSubject, now, sendPing), takeUntil(triggerSubject)).subscribe({
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

        it('should call sendPing()', (done) => {
            NEVER.pipe(sendPeriodicPings(localSentTimesSubject, now, sendPing), takeUntil(triggerSubject)).subscribe({
                complete() {
                    expect(sendPing).to.have.been.calledOnce.and.calledWithExactly(0);

                    done();
                }
            });
        });

        it('should update the stored pings', (done) => {
            NEVER.pipe(sendPeriodicPings(localSentTimesSubject, now, sendPing), takeUntil(triggerSubject)).subscribe({
                complete() {
                    expect(localSentTimesSubject.getValue()).to.deep.equal([0, [0.123456789]]);

                    done();
                }
            });
        });
    });

    describe('with two triggers', () => {
        beforeEach(() => {
            now.onFirstCall().returns(0.123456789).onSecondCall().returns(1.23456789);
            sendPing.onSecondCall().callsFake(() => setTimeout(() => triggerSubject.next(null)));
        });

        it('should not emit any value', (done) => {
            NEVER.pipe(sendPeriodicPings(localSentTimesSubject, now, sendPing), takeUntil(triggerSubject)).subscribe({
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

        it('should call sendPing()', (done) => {
            NEVER.pipe(sendPeriodicPings(localSentTimesSubject, now, sendPing), takeUntil(triggerSubject)).subscribe({
                complete() {
                    expect(sendPing).to.have.been.calledTwice.and.calledWithExactly(1);

                    done();
                }
            });
        });

        it('should update the stored pings', (done) => {
            NEVER.pipe(sendPeriodicPings(localSentTimesSubject, now, sendPing), takeUntil(triggerSubject)).subscribe({
                complete() {
                    expect(localSentTimesSubject.getValue()).to.deep.equal([0, [0.123456789, 1.23456789]]);

                    done();
                }
            });
        });
    });
});
