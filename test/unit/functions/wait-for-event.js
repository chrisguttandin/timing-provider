import { finalize, merge, takeUntil } from 'rxjs';
import { spy, stub } from 'sinon';
import { marbles } from 'rxjs-marbles';
import { waitForEvent } from '../../../src/functions/wait-for-event';

describe('waitForEvent', () => {
    let fakeEventTarget;
    let fakeEventTargetListener;

    beforeEach(() => {
        fakeEventTargetListener = [];
        fakeEventTarget = {
            addEventListener: stub().callsFake((_, listener) => {
                fakeEventTargetListener = listener;
            }),
            removeEventListener: spy()
        };
    });

    afterEach(() => {
        expect(fakeEventTarget.addEventListener).to.have.been.calledOnce;
        expect(fakeEventTarget.addEventListener).to.have.been.calledWithExactly('event', fakeEventTargetListener);
    });

    describe('without any emitted event', () => {
        describe('without unsubscribing', () => {
            afterEach(() => {
                expect(fakeEventTarget.removeEventListener).to.have.not.been.called;
            });

            it(
                'should not emit a value',
                marbles((helpers) => {
                    const expected = helpers.cold('-----');
                    const destination = waitForEvent(fakeEventTarget, 'event');

                    helpers.expect(destination).toBeObservable(expected);
                })
            );
        });

        describe('with unsubscribing at 20ms', () => {
            afterEach(() => {
                expect(fakeEventTarget.removeEventListener).to.have.been.calledOnce;
                expect(fakeEventTarget.removeEventListener).to.have.been.calledWithExactly('event', fakeEventTargetListener);
            });

            it(
                'should not emit a value',
                marbles((helpers) => {
                    const expected = helpers.cold('--|');
                    const destination = waitForEvent(fakeEventTarget, 'event').pipe(takeUntil(helpers.cold('--a|')));

                    helpers.expect(destination).toBeObservable(expected);
                })
            );
        });
    });

    describe('with an emitted event at 20ms', () => {
        afterEach(() => {
            expect(fakeEventTarget.removeEventListener).to.have.been.calledTwice;
            expect(fakeEventTarget.removeEventListener).to.have.been.calledWithExactly('event', fakeEventTargetListener);
        });

        it(
            'should emit the value',
            marbles((helpers) => {
                const expected = helpers.cold('--(a|)', { a: fakeEventTarget });
                const destination = merge(
                    helpers.cold('--|').pipe(finalize(() => fakeEventTargetListener())),
                    waitForEvent(fakeEventTarget, 'event')
                );

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });
});
