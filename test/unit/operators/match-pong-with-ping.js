import { BehaviorSubject, of } from 'rxjs';
import { marbles } from 'rxjs-marbles';
import { matchPongWithPing } from '../../../src/operators/match-pong-with-ping';

describe('matchPongWithPing', () => {
    let localSentTimesSubject;

    beforeEach(() => {
        localSentTimesSubject = new BehaviorSubject([0, []]);
    });

    describe('without any event', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(matchPongWithPing(localSentTimesSubject));
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
                const destination = helpers.cold('#', null, err).pipe(matchPongWithPing(localSentTimesSubject));
                const expected = helpers.cold('#', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with an expected pong', () => {
        let pong;
        let remoteReceivedTime;
        let remoteSentTime;
        let timestamp;

        beforeEach(() => {
            localSentTimesSubject.next([0, [0.123456789, 1.23456789]]);
            remoteReceivedTime = 'a fake remoteReceivedTime';
            remoteSentTime = 'a fake remoteSentTime';
            timestamp = 'a fake timestamp';
            pong = { index: 0, remoteReceivedTime, remoteSentTime, timestamp };
        });

        beforeEach(() => {
            localSentTimesSubject.next([0, [0.123456789]]);
        });

        it(
            'should emit the pong with the matching ping',
            marbles((helpers) => {
                const destination = helpers.cold('a|', { a: pong }).pipe(matchPongWithPing(localSentTimesSubject));
                const expected = helpers.cold('a|', { a: [0.123456789, remoteReceivedTime, remoteSentTime, timestamp] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should update the stored pings', (done) => {
            of(pong)
                .pipe(matchPongWithPing(localSentTimesSubject))
                .subscribe({
                    complete() {
                        expect(localSentTimesSubject.getValue()).to.deep.equal([1, []]);

                        done();
                    }
                });
        });
    });

    describe('with an early pong', () => {
        let pong;
        let remoteReceivedTime;
        let remoteSentTime;
        let timestamp;

        beforeEach(() => {
            localSentTimesSubject.next([0, [0.123456789, 1.23456789]]);
            remoteReceivedTime = 'a fake remoteReceivedTime';
            remoteSentTime = 'a fake remoteSentTime';
            timestamp = 'a fake timestamp';
            pong = { index: 1, remoteReceivedTime, remoteSentTime, timestamp };
        });

        it(
            'should emit the pong with the matching ping',
            marbles((helpers) => {
                const destination = helpers.cold('a|', { a: pong }).pipe(matchPongWithPing(localSentTimesSubject));
                const expected = helpers.cold('a|', { a: [1.23456789, remoteReceivedTime, remoteSentTime, timestamp] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should update the stored pings', (done) => {
            of(pong)
                .pipe(matchPongWithPing(localSentTimesSubject))
                .subscribe({
                    complete() {
                        expect(localSentTimesSubject.getValue()).to.deep.equal([2, []]);

                        done();
                    }
                });
        });
    });

    describe('with a late pong', () => {
        let pong;
        let remoteReceivedTime;
        let remoteSentTime;
        let timestamp;

        beforeEach(() => {
            localSentTimesSubject.next([1, [1.23456789]]);
            remoteReceivedTime = 'a fake remoteReceivedTime';
            remoteSentTime = 'a fake remoteSentTime';
            timestamp = 'a fake timestamp';
            pong = { index: 0, remoteReceivedTime, remoteSentTime, timestamp };
        });

        it(
            'should emit the pong with the matching ping',
            marbles((helpers) => {
                const destination = helpers.cold('a|', { a: pong }).pipe(matchPongWithPing(localSentTimesSubject));
                const expected = helpers.cold('-|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should not update the stored pings', (done) => {
            of(pong)
                .pipe(matchPongWithPing(localSentTimesSubject))
                .subscribe({
                    complete() {
                        expect(localSentTimesSubject.getValue()).to.deep.equal([1, [1.23456789]]);

                        done();
                    }
                });
        });
    });
});
