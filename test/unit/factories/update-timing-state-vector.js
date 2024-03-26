import { createUpdateTimingStateVector } from '../../../src/factories/update-timing-state-vector';
import { stub } from 'sinon';

describe('updateTimingStateVector()', () => {
    let filterTimingStateVectorUpdate;
    let performance;
    let timingStateVector;
    let timingStateVectorUpdate;
    let translateTimingStateVector;
    let translatedTimingStateVector;
    let updateTimingStateVector;

    beforeEach(() => {
        filterTimingStateVectorUpdate = stub();
        performance = { now: stub() };
        timingStateVector = { acceleration: 0, position: 0, timestamp: 0, velocity: 0 };
        timingStateVectorUpdate = Symbol('timingStateVectorUpdate');
        translateTimingStateVector = stub();
        translatedTimingStateVector = { acceleration: 0, position: 0, timestamp: 10, velocity: 0 };

        updateTimingStateVector = createUpdateTimingStateVector(filterTimingStateVectorUpdate, performance, translateTimingStateVector);

        filterTimingStateVectorUpdate.returns({});
        performance.now.returns(10000);
        translateTimingStateVector.returns(translatedTimingStateVector);
    });

    it('should call filterTimingStateVectorUpdate()', () => {
        updateTimingStateVector(timingStateVector, timingStateVectorUpdate);

        expect(filterTimingStateVectorUpdate).to.have.been.calledOnceWithExactly(timingStateVectorUpdate);
    });

    it('should call translateTimingStateVector()', () => {
        updateTimingStateVector(timingStateVector, timingStateVectorUpdate);

        expect(translateTimingStateVector).to.have.been.calledOnceWithExactly(timingStateVector, 10);
    });

    describe('without any property', () => {
        it('should return null', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.equal(null);
        });
    });

    describe('with the same acceleration', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.returns({ acceleration: 0 });
        });

        it('should return null', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.equal(null);
        });
    });

    describe('with a new acceleration', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.returns({ acceleration: 1 });
        });

        it('should return an updated vector', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.deep.equal({
                acceleration: 1,
                position: 0,
                timestamp: 10,
                velocity: 0
            });
        });
    });

    describe('with the same position', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.returns({ position: 0 });
        });

        it('should return null', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.equal(null);
        });
    });

    describe('with a new position', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.returns({ position: 10 });
        });

        it('should return an updated vector', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.deep.equal({
                acceleration: 0,
                position: 10,
                timestamp: 10,
                velocity: 0
            });
        });
    });

    describe('with the same velocity', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.returns({ velocity: 0 });
        });

        it('should return null', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.equal(null);
        });
    });

    describe('with a new velocity', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.returns({ velocity: 1 });
        });

        it('should return an updated vector', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.deep.equal({
                acceleration: 0,
                position: 0,
                timestamp: 10,
                velocity: 1
            });
        });
    });
});
