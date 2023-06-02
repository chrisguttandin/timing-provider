import { createSortByHops } from '../../../src/factories/sort-by-hops';
import { stub } from 'sinon';

describe('sortByHops()', () => {
    let array;
    let compareHops;
    let hopsA;
    let hopsB;
    let sortByHops;

    beforeEach(() => {
        hopsA = ['an', 'array', 'of', 'fake', 'hops'];
        hopsB = ['another', 'array', 'of', 'fake', 'hops'];
        array = [[{ hops: hopsA }], [{ hops: hopsB }]];
        compareHops = stub();

        sortByHops = createSortByHops(compareHops);

        compareHops.callsFake((hops) => (hops === hopsA ? 1 : -1));
    });

    it('should call compareHops()', () => {
        sortByHops(array);

        try {
            expect(compareHops).to.have.been.calledOnceWithExactly(hopsA, hopsB);
        } catch {
            expect(compareHops).to.have.been.calledOnceWithExactly(hopsB, hopsA);
        }
    });

    it('should use compareHops() to sort the given array', () => {
        sortByHops(array);

        expect(array).to.deep.equal([[{ hops: hopsB }], [{ hops: hopsA }]]);
    });

    it('should return undefined', () => {
        expect(sortByHops(array)).to.be.undefined;
    });
});
