import { groupByProperty } from '../../../src/operators/group-by-property';
import { marbles } from 'rxjs-marbles';

describe('groupByProperty', () => {
    describe('without any value', () => {
        it(
            'should mirror an empty observable',
            marbles((helpers) => {
                const destination = helpers.cold('|').pipe(groupByProperty('property'));
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
                const destination = helpers.cold('#', null, err).pipe(groupByProperty('property'));
                const expected = helpers.cold('#', null, err);

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a single value', () => {
        let value;

        beforeEach(
            () =>
                (value = {
                    a: 'first',
                    property: 'a'
                })
        );

        it(
            'should emit an observable with that value',
            marbles((helpers) => {
                const group = helpers.cold('a|', { a: value });
                const destination = helpers.cold('a|', { a: value }).pipe(groupByProperty('property'));
                const expected = helpers.cold('a|', { a: group });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a two values with the same property value', () => {
        let values;

        beforeEach(
            () =>
                (values = [
                    {
                        a: 'first',
                        property: 'a'
                    },
                    {
                        a: 'second',
                        property: 'a'
                    }
                ])
        );

        it(
            'should emit an observable with those values',
            marbles((helpers) => {
                const group = helpers.cold('ab|', { a: values[0], b: values[1] });
                const destination = helpers.cold('ab|', { a: values[0], b: values[1] }).pipe(groupByProperty('property'));
                const expected = helpers.cold('a-|', { a: group });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });

    describe('with a two values with different property values', () => {
        let values;

        beforeEach(
            () =>
                (values = [
                    {
                        a: 'first',
                        property: 'a'
                    },
                    {
                        b: 'first',
                        property: 'b'
                    }
                ])
        );

        it(
            'should emit two observables with one of those values emitted by each',
            marbles((helpers) => {
                const groups = [helpers.cold('a-|', { a: values[0] }), helpers.cold('a|', { a: values[1] })];
                const destination = helpers.cold('ab|', { a: values[0], b: values[1] }).pipe(groupByProperty('property'));
                const expected = helpers.cold('ab|', { a: groups[0], b: groups[1] });

                helpers.expect(destination).toBeObservable(expected);
            })
        );
    });
});
