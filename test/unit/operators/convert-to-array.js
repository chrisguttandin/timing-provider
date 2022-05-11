import { convertToArray } from '../../../src/operators/convert-to-array';
import { marbles } from 'rxjs-marbles';

describe('convertToArray', () => {
    describe('without any observable', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(convertToArray());
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
                const destination = helpers.cold('#', null, err).pipe(convertToArray());
                const expected = helpers.cold('#', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single observable', () => {
        it(
            'should emit an array with the value emitted by the observable',
            marbles((helpers) => {
                const observable = helpers.cold('a|', { a: 'a' });
                const destination = helpers.cold('a|', { a: observable }).pipe(convertToArray());
                const expected = helpers.cold('a(b|)', { a: ['a'], b: [] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it(
            'should emit two arrays with the values emitted by the observable',
            marbles((helpers) => {
                const observable = helpers.cold('ab|', { a: 'a', b: 'b' });
                const destination = helpers.cold('a|', { a: observable }).pipe(convertToArray());
                const expected = helpers.hot('ab(c|)', { a: ['a'], b: ['b'], c: [] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with two observables', () => {
        it(
            'should emit arrays with the values emitted by both observables',
            marbles((helpers) => {
                const destination = helpers
                    .cold('ab|', {
                        a: helpers.cold('a-|', { a: 'a' }),
                        b: helpers.cold('x-|', { x: 'x' })
                    })
                    .pipe(convertToArray());
                const expected = helpers.cold('abc(d|)', { a: ['a'], b: ['a', 'x'], c: ['x'], d: [] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );

        it(
            'should emit arrays with the values emitted by both observables',
            marbles((helpers) => {
                const destination = helpers
                    .cold('ab|', {
                        a: helpers.cold('a-b-|', { a: 'a', b: 'b' }),
                        b: helpers.cold('x-y-|', { x: 'x', y: 'y' })
                    })
                    .pipe(convertToArray());
                const expected = helpers.cold('abcde(f|)', { a: ['a'], b: ['a', 'x'], c: ['b', 'x'], d: ['b', 'y'], e: ['y'], f: [] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });
});
