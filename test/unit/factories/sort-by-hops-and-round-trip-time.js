import { createSortByHopsAndRoundTripTime } from '../../../src/factories/sort-by-hops-and-round-trip-time';
import { stub } from 'sinon';

describe('sortByHopsAndRoundTripTime()', () => {
    let array;
    let compareHops;
    let hopsA;
    let hopsB;
    let sortByHopsAndRoundTripTime;
    let valueA;
    let valueB;

    beforeEach(() => {
        hopsA = ['an', 'array', 'of', 'fake', 'hops'];
        hopsB = ['another', 'array', 'of', 'fake', 'hops'];
        valueA = [hopsA];
        valueB = [hopsB];
        array = [valueA, valueB];
        compareHops = stub();

        sortByHopsAndRoundTripTime = createSortByHopsAndRoundTripTime(compareHops, ([hops]) => hops);

        compareHops.callsFake((hops) => (hops === hopsA ? 1 : -1));
    });

    it('should call compareHops()', () => {
        sortByHopsAndRoundTripTime(array);

        try {
            expect(compareHops).to.have.been.calledOnceWithExactly(hopsA, hopsB);
        } catch {
            expect(compareHops).to.have.been.calledOnceWithExactly(hopsB, hopsA);
        }
    });

    it('should use compareHops() to sort the given array', () => {
        sortByHopsAndRoundTripTime(array);

        expect(array).to.deep.equal([valueB, valueA]);
    });

    it('should return undefined', () => {
        expect(sortByHopsAndRoundTripTime(array)).to.be.undefined;
    });
});
