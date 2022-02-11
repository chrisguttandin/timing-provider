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
        'should remove a new value from the array',
        marbles((helpers) => {
            const destination = helpers.cold('ab|', { a: [value, true], b: [value, false] }).pipe(maintainArray());
            const expected = helpers.cold('ab|', { a: [value], b: [] });

            helpers.expect(destination).toBeObservable(expected);
        })
    );
});
