import { filterUniqueValues } from '../../../src/operators/filter-unique-values';
import { marbles } from 'rxjs-marbles';

describe('filterUniqueValues', () => {
    describe('without any observable', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(filterUniqueValues());
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
                const destination = helpers.cold('#', null, err).pipe(filterUniqueValues());
                const expected = helpers.cold('#', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single value', () => {
        it(
            'should emit the value',
            marbles((helpers) => {
                const object = { a: ['fake', 'object'] };
                const destination = helpers.cold('a|', { a: [[object]] }).pipe(filterUniqueValues());
                const expected = helpers.cold('a|', { a: [object] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a duplicate value', () => {
        it(
            'should emit the value only once',
            marbles((helpers) => {
                const object = { a: ['fake', 'object'] };
                const destination = helpers.cold('aa|', { a: [[object]] }).pipe(filterUniqueValues());
                const expected = helpers.cold('a-|', { a: [object] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with an array with two values', () => {
        it(
            'should emit both values',
            marbles((helpers) => {
                const objects = [{ a: ['fake', 'object'] }, { another: ['fake', 'object'] }];
                const destination = helpers.cold('a---|', { a: [[objects[0]], [objects[1]]] }).pipe(filterUniqueValues());
                const expected = helpers.cold('(ab)|', { a: [objects[0]], b: [objects[1]] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with two separate values', () => {
        it(
            'should emit both values',
            marbles((helpers) => {
                const objects = [{ a: ['fake', 'object'] }, { another: ['fake', 'object'] }];
                const destination = helpers.cold('ab|', { a: [[objects[0]]], b: [[objects[1]]] }).pipe(filterUniqueValues());
                const expected = helpers.cold('ab|', { a: [objects[0]], b: [objects[1]] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });
});
