import { demultiplexMessages } from '../../../src/operators/demultiplex-messages';
import { marbles } from 'rxjs-marbles';

describe('demultiplexMessages', () => {
    let clientId;

    beforeEach(() => {
        clientId = 'a fake client id';
    });

    describe('without any event', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const timer = () => helpers.cold('a|');
                const destination = helpers.cold('|').pipe(demultiplexMessages(timer));
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
                const timer = () => helpers.cold('a|');
                const destination = helpers.cold('#', null, err).pipe(demultiplexMessages(timer));
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
                    message: {
                        mask: {
                            client: {
                                id: clientId
                            }
                        }
                    },
                    type: 'request'
                })
        );

        it(
            'should emit an observable with the event',
            marbles((helpers) => {
                const timer = () => helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(timer));
                const expected = helpers.cold('a|', { a: helpers.cold('a|', { a: event }) });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single candidate event', () => {
        let event;

        beforeEach(
            () =>
                (event = {
                    client: {
                        id: clientId
                    },
                    message: {
                        type: 'candidate'
                    }
                })
        );

        it(
            'should emit an observable with the event',
            marbles((helpers) => {
                const timer = () => helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(timer));
                const expected = helpers.cold('a|', { a: helpers.cold('a|', { a: event }) });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single description event', () => {
        let event;

        beforeEach(
            () =>
                (event = {
                    client: {
                        id: clientId
                    },
                    message: {
                        type: 'description'
                    }
                })
        );

        it(
            'should emit an observable with the event',
            marbles((helpers) => {
                const timer = () => helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(timer));
                const expected = helpers.cold('a|', { a: helpers.cold('a|', { a: event }) });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single summary event', () => {
        let event;

        beforeEach(
            () =>
                (event = {
                    client: {
                        id: clientId
                    },
                    message: {
                        type: 'summary'
                    }
                })
        );

        it(
            'should emit an observable with the event',
            marbles((helpers) => {
                const timer = () => helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(timer));
                const expected = helpers.cold('a|', { a: helpers.cold('a|', { a: event }) });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single termination event', () => {
        let event;

        beforeEach(
            () =>
                (event = {
                    client: {
                        id: clientId
                    },
                    message: {
                        type: 'termination'
                    }
                })
        );

        it(
            'should not emit any observable',
            marbles((helpers) => {
                const timer = () => helpers.cold('a|');
                const destination = helpers.cold('a|', { a: event }).pipe(demultiplexMessages(timer));
                const expected = helpers.cold('-|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });
});