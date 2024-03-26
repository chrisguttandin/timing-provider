import { combineAsTuple } from '../../../src/operators/combine-as-tuple';
import { marbles } from 'rxjs-marbles';

describe('combineAsTuple', () => {
    describe('without any value', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(combineAsTuple());
                const expected = helpers.cold('(|)');

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with an error', () => {
        it(
            'should mirror an error observable',
            marbles((helpers) => {
                const err = new Error('a fake error');
                const destination = helpers.cold('#', null, err).pipe(combineAsTuple());
                const expected = helpers.cold('(#)', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single value to replace the first element', () => {
        it(
            'should emit an updated tuple',
            marbles((helpers) => {
                const firstElement = Symbol('firstElement');
                const destination = helpers.cold('a---|', { a: [0, firstElement] }).pipe(combineAsTuple());
                const expected = helpers.cold('----|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single value to replace the second element', () => {
        it(
            'should emit an updated tuple',
            marbles((helpers) => {
                const secondElement = Symbol('secondElement');
                const destination = helpers.cold('a---|', { a: [1, secondElement] }).pipe(combineAsTuple());
                const expected = helpers.cold('----|');

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single value to replace the first element and the second element', () => {
        it(
            'should emit an updated tuple',
            marbles((helpers) => {
                const firstElement = Symbol('firstElement');
                const secondElement = Symbol('secondElement');
                const destination = helpers.cold('a---b|', { a: [0, firstElement], b: [1, secondElement] }).pipe(combineAsTuple());
                const expected = helpers.cold('----a|', {
                    a: [firstElement, secondElement]
                });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });
});
