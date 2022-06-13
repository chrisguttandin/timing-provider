import { combineAsTuple } from '../../../src/operators/combine-as-tuple';
import { marbles } from 'rxjs-marbles';

describe('combineAsTuple', () => {
    let firstElement;
    let secondElement;

    beforeEach(() => {
        firstElement = 'a fake first element';
        secondElement = 'a fake second element';
    });

    describe('without emit the initial value', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(combineAsTuple([firstElement, secondElement]));
                const expected = helpers.cold('(a|)', { a: [firstElement, secondElement] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with an error', () => {
        it(
            'should mirror an error observable',
            marbles((helpers) => {
                const err = new Error('a fake error');
                const destination = helpers.cold('#', null, err).pipe(combineAsTuple([firstElement, secondElement]));
                const expected = helpers.cold('(a#)', { a: [firstElement, secondElement] }, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single value to replace the first element', () => {
        it(
            'should emit an updated tuple',
            marbles((helpers) => {
                const newFirstElement = 'a fake new first element';
                const destination = helpers.cold('a---|', { a: [0, newFirstElement] }).pipe(combineAsTuple([firstElement, secondElement]));
                const expected = helpers.cold('(ab)|', { a: [firstElement, secondElement], b: [newFirstElement, secondElement] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single value to replace the second element', () => {
        it(
            'should emit an updated tuple',
            marbles((helpers) => {
                const newSecondElement = 'a fake new second element';
                const destination = helpers.cold('a---|', { a: [1, newSecondElement] }).pipe(combineAsTuple([firstElement, secondElement]));
                const expected = helpers.cold('(ab)|', { a: [firstElement, secondElement], b: [firstElement, newSecondElement] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single value to replace the first element and the second element', () => {
        it(
            'should emit updated tuples',
            marbles((helpers) => {
                const newFirstElement = 'a fake new first element';
                const newSecondElement = 'a fake new second element';
                const destination = helpers
                    .cold('a---b|', { a: [0, newFirstElement], b: [1, newSecondElement] })
                    .pipe(combineAsTuple([firstElement, secondElement]));
                const expected = helpers.cold('(ab)c|', {
                    a: [firstElement, secondElement],
                    b: [newFirstElement, secondElement],
                    c: [newFirstElement, newSecondElement]
                });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });
});
