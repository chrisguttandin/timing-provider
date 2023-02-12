import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { sendPeriodicPings } from '../../../src/observables/send-periodic-pings';
import { stub } from 'sinon';

describe('sendPeriodicPings', () => {
    let localSentTimesSubject;
    let now;
    let originalNow;
    let sendPing;
    let triggerSubject;

    afterEach(() => {
        // eslint-disable-next-line no-undef
        global.performance.now = originalNow;
    });

    beforeEach(() => {
        localSentTimesSubject = new BehaviorSubject([0, []]);
        now = stub();
        // eslint-disable-next-line no-undef
        originalNow = global.performance.now;
        sendPing = stub();
        triggerSubject = new Subject();

        // eslint-disable-next-line no-undef
        global.performance.now = now;
    });

    describe('with one trigger', () => {
        beforeEach(() => {
            now.returns(0.123456789);
            sendPing.callsFake(() => setTimeout(() => triggerSubject.next(null)));
        });

        it('should not emit any value', (done) => {
            sendPeriodicPings(localSentTimesSubject, sendPing)
                .pipe(takeUntil(triggerSubject))
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

        it('should call sendPing()', (done) => {
            sendPeriodicPings(localSentTimesSubject, sendPing)
                .pipe(takeUntil(triggerSubject))
                .subscribe({
                    complete() {
                        expect(sendPing).to.have.been.calledOnce.and.calledWithExactly(0);

                        done();
                    }
                });
        });

        it('should update the stored pings', (done) => {
            sendPeriodicPings(localSentTimesSubject, sendPing)
                .pipe(takeUntil(triggerSubject))
                .subscribe({
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
            sendPeriodicPings(localSentTimesSubject, sendPing)
                .pipe(takeUntil(triggerSubject))
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

        it('should call sendPing()', (done) => {
            sendPeriodicPings(localSentTimesSubject, sendPing)
                .pipe(takeUntil(triggerSubject))
                .subscribe({
                    complete() {
                        expect(sendPing).to.have.been.calledTwice.and.calledWithExactly(1);

                        done();
                    }
                });
        });

        it('should update the stored pings', (done) => {
            sendPeriodicPings(localSentTimesSubject, sendPing)
                .pipe(takeUntil(triggerSubject))
                .subscribe({
                    complete() {
                        expect(localSentTimesSubject.getValue()).to.deep.equal([0, [0.123456789, 1.23456789]]);

                        done();
                    }
                });
        });
    });
});
