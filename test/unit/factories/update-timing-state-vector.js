import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUpdateTimingStateVector } from '../../../src/factories/update-timing-state-vector';

describe('updateTimingStateVector()', () => {
    let filterTimingStateVectorUpdate;
    let performance;
    let timingStateVector;
    let timingStateVectorUpdate;
    let translateTimingStateVector;
    let translatedTimingStateVector;
    let updateTimingStateVector;

    beforeEach(() => {
        filterTimingStateVectorUpdate = vi.fn();
        performance = { now: vi.fn() };
        timingStateVector = { acceleration: 0, position: 0, timestamp: 0, velocity: 0 };
        timingStateVectorUpdate = Symbol('timingStateVectorUpdate');
        translateTimingStateVector = vi.fn();
        translatedTimingStateVector = { acceleration: 0, position: 0, timestamp: 10, velocity: 0 };

        updateTimingStateVector = createUpdateTimingStateVector(filterTimingStateVectorUpdate, performance, translateTimingStateVector);

        filterTimingStateVectorUpdate.mockReturnValue({});
        performance.now.mockReturnValue(10000);
        translateTimingStateVector.mockReturnValue(translatedTimingStateVector);
    });

    it('should call filterTimingStateVectorUpdate()', () => {
        updateTimingStateVector(timingStateVector, timingStateVectorUpdate);

        expect(filterTimingStateVectorUpdate).to.have.been.calledOnceWith(timingStateVectorUpdate);
    });

    it('should call translateTimingStateVector()', () => {
        updateTimingStateVector(timingStateVector, timingStateVectorUpdate);

        expect(translateTimingStateVector).to.have.been.calledOnceWith(timingStateVector, 10);
    });

    describe('without any property', () => {
        it('should return null', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.equal(null);
        });
    });

    describe('with the same acceleration', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.mockReturnValue({ acceleration: 0 });
        });

        it('should return null', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.equal(null);
        });
    });

    describe('with a new acceleration', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.mockReturnValue({ acceleration: 1 });
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
            filterTimingStateVectorUpdate.mockReturnValue({ position: 0 });
        });

        it('should return null', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.equal(null);
        });
    });

    describe('with a new position', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.mockReturnValue({ position: 10 });
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
            filterTimingStateVectorUpdate.mockReturnValue({ velocity: 0 });
        });

        it('should return null', () => {
            expect(updateTimingStateVector(timingStateVector, timingStateVectorUpdate)).to.equal(null);
        });
    });

    describe('with a new velocity', () => {
        beforeEach(() => {
            filterTimingStateVectorUpdate.mockReturnValue({ velocity: 1 });
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
