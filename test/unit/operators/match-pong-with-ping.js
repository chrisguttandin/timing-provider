import { BehaviorSubject, of } from 'rxjs';
import { marbles } from 'rxjs-marbles';
import { matchPongWithPing } from '../../../src/operators/match-pong-with-ping';

describe('matchPongWithPing', () => {
    let pingsSubject;

    beforeEach(() => {
        pingsSubject = new BehaviorSubject([0, []]);
    });

    describe('without any event', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(matchPongWithPing(pingsSubject));
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
                const destination = helpers.cold('#', null, err).pipe(matchPongWithPing(pingsSubject));
                const expected = helpers.cold('#', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with an expected pong', () => {
        let pong;
        let received;
        let send;
        let timestamp;

        beforeEach(() => {
            pingsSubject.next([0, [0.123456789, 1.23456789]]);
            received = 'a faked received time';
            send = 'a faked send time';
            timestamp = 'a faked timestamp';
            pong = { index: 0, message: [received, send], timestamp };
        });

        beforeEach(() => {
            pingsSubject.next([0, [0.123456789]]);
        });

        it(
            'should emit the pong with the matching ping',
            marbles((helpers) => {
                const destination = helpers.cold('a|', { a: pong }).pipe(matchPongWithPing(pingsSubject));
                const expected = helpers.cold('a|', { a: [0.123456789, [received, send, timestamp]] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should update the stored pings', (done) => {
            of(pong)
                .pipe(matchPongWithPing(pingsSubject))
                .subscribe({
                    complete() {
                        expect(pingsSubject.getValue()).to.deep.equal([1, []]);

                        done();
                    }
                });
        });
    });

    describe('with an early pong', () => {
        let pong;
        let received;
        let send;
        let timestamp;

        beforeEach(() => {
            pingsSubject.next([0, [0.123456789, 1.23456789]]);
            received = 'a faked received time';
            send = 'a faked send time';
            timestamp = 'a faked timestamp';
            pong = { index: 1, message: [received, send], timestamp };
        });

        it(
            'should emit the pong with the matching ping',
            marbles((helpers) => {
                const destination = helpers.cold('a|', { a: pong }).pipe(matchPongWithPing(pingsSubject));
                const expected = helpers.cold('a|', { a: [1.23456789, [received, send, timestamp]] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should update the stored pings', (done) => {
            of(pong)
                .pipe(matchPongWithPing(pingsSubject))
                .subscribe({
                    complete() {
                        expect(pingsSubject.getValue()).to.deep.equal([2, []]);

                        done();
                    }
                });
        });
    });

    describe('with a late pong', () => {
        let pong;
        let received;
        let send;
        let timestamp;

        beforeEach(() => {
            pingsSubject.next([1, [1.23456789]]);
            received = 'a faked received time';
            send = 'a faked send time';
            timestamp = 'a faked timestamp';
            pong = { index: 0, message: [received, send], timestamp };
        });

        it(
            'should emit the pong with the matching ping',
            marbles((helpers) => {
                const destination = helpers.cold('a|', { a: pong }).pipe(matchPongWithPing(pingsSubject));
                const expected = helpers.cold('-|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it('should not update the stored pings', (done) => {
            of(pong)
                .pipe(matchPongWithPing(pingsSubject))
                .subscribe({
                    complete() {
                        expect(pingsSubject.getValue()).to.deep.equal([1, [1.23456789]]);

                        done();
                    }
                });
        });
    });
});
