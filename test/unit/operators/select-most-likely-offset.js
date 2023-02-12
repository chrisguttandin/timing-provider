import { marbles } from 'rxjs-marbles';
import { selectMostLikelyOffset } from '../../../src/operators/select-most-likely-offset';

describe('selectMostLikelyOffset', () => {
    describe('without any tuple', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(selectMostLikelyOffset());
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
                const destination = helpers.cold('#', null, err).pipe(selectMostLikelyOffset());
                const expected = helpers.cold('#', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with one tuple', () => {
        it(
            'should emit the offset (devided by 1000) of the first tuple',
            marbles((helpers) => {
                const destination = helpers.cold('a|', { a: [1, 2] }).pipe(selectMostLikelyOffset());
                const expected = helpers.cold('a|', { a: 1 / 1000 });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with two tuples', () => {
        it(
            'should emit the offset (devided by 1000) of the tuple with the smallest round trip time',
            marbles((helpers) => {
                const destination = helpers.cold('ab|', { a: [1, 2], b: [3, 4] }).pipe(selectMostLikelyOffset());
                const expected = helpers.cold('ab|', { a: 1 / 1000, b: 1 / 1000 });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with three tuples', () => {
        it(
            'should emit the offset (devided by 1000) of the tuple with the smallest round trip time',
            marbles((helpers) => {
                const destination = helpers.cold('ab|', { a: [6, 5], b: [4, 3], c: [2, 1] }).pipe(selectMostLikelyOffset());
                const expected = helpers.cold('ab|', { a: 6 / 1000, b: 4 / 1000, c: 2 / 1000 });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with sixty tuples', () => {
        it(
            'should emit the offset (devided by 1000) of the tuple with the smallest round trip time',
            marbles((helpers) => {
                const destination = helpers.cold(`a${'b'.repeat(59)}|`, { a: [1, 2], b: [3, 4] }).pipe(selectMostLikelyOffset());
                const expected = helpers.cold(`${'a'.repeat(60)}|`, { a: 1 / 1000 });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with sixty one tuples', () => {
        it(
            'should emit the offset (devided by 1000) of the tuple with the smallest round trip time within the last sixty tuples',
            marbles((helpers) => {
                const destination = helpers.cold(`a${'b'.repeat(60)}|`, { a: [1, 2], b: [3, 4] }).pipe(selectMostLikelyOffset());
                const expected = helpers.cold(`${'a'.repeat(60)}b|`, { a: 1 / 1000, b: 3 / 1000 });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });
});
