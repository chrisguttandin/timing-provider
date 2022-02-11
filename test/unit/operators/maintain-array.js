import { maintainArray } from '../../../src/operators/maintain-array';
import { marbles } from 'rxjs-marbles';

describe('maintainArray', () => {
    let value;

    beforeEach(() => (value = { a: 'fake value' }));

    it(
        'should add a new value to the array',
        marbles((helpers) => {
            const destination = helpers.cold('a|', { a: [value, true] }).pipe(maintainArray());
            const expected = helpers.cold('a|', { a: [value] });

            helpers.expect(destination).toBeObservable(expected);
        })
    );

    it(
        'should not add a value that is already stored in the array',
        marbles((helpers) => {
            const destination = helpers.cold('ab|', { a: [value, true], b: [value, true] }).pipe(maintainArray());
            const expected = helpers.cold('a#', { a: [value] }, new Error('The array does already contain the value to be added.'));

            helpers.expect(destination).toBeObservable(expected);
        })
    );

    it(
        'should remove a new value from the array',
        marbles((helpers) => {
            const destination = helpers.cold('ab|', { a: [value, true], b: [value, false] }).pipe(maintainArray());
            const expected = helpers.cold('ab|', { a: [value], b: [] });

            helpers.expect(destination).toBeObservable(expected);
        })
    );

    it(
        'should not remove a value that is not stored in the array',
        marbles((helpers) => {
            const destination = helpers.cold('a|', { a: [value, false] }).pipe(maintainArray());
            const expected = helpers.cold('#', null, new Error("The array doesn't contain the value to be removed."));

            helpers.expect(destination).toBeObservable(expected);
        })
    );
});
