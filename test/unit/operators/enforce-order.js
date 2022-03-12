import { enforceOrder } from '../../../src/operators/enforce-order';
import { marbles } from 'rxjs-marbles';

describe('enforceOrder', () => {
    let firstValue;
    let isFirstValue;
    let subsequentValue;

    beforeEach(() => {
        firstValue = 'a fake first value';
        isFirstValue = (value) => value === firstValue;
        subsequentValue = 'a fake subsequent value';
    });

    it(
        'should emit an ordered serious of values if they were ordered already',
        marbles((helpers) => {
            const destination = helpers.cold('ab|', { a: firstValue, b: subsequentValue }).pipe(enforceOrder(isFirstValue));
            const expected = helpers.cold('ab|', { a: firstValue, b: subsequentValue });

            helpers.expect(destination).toBeObservable(expected);
        })
    );

    it(
        'should emit an ordered serious of values if they were unordered before',
        marbles((helpers) => {
            const destination = helpers.cold('ab---|', { a: subsequentValue, b: firstValue }).pipe(enforceOrder(isFirstValue));
            const expected = helpers.cold('-(ab)|', { a: firstValue, b: subsequentValue });

            helpers.expect(destination).toBeObservable(expected);
        })
    );

    it(
        'should emit an error if two values get identified as the first value',
        marbles((helpers) => {
            const destination = helpers.cold('ab|', { a: firstValue, b: firstValue }).pipe(enforceOrder(isFirstValue));
            const expected = helpers.cold(
                'a#',
                { a: firstValue },
                new Error('Another value has been identified as the first value already.')
            );

            helpers.expect(destination).toBeObservable(expected);
        })
    );
});
