import type {
    ITimingStateVector,
    TTimingStateVectorUpdate,
    filterTimingStateVectorUpdate as filterTimingStateVectorUpdateFunction,
    translateTimingStateVector as translateTimingStateVectorFunction
} from 'timing-object';

export const createUpdateTimingStateVector = (
    filterTimingStateVectorUpdate: typeof filterTimingStateVectorUpdateFunction,
    performance: Window['performance'],
    translateTimingStateVector: typeof translateTimingStateVectorFunction
) => {
    return (timingStateVector: ITimingStateVector, timingStateVectorUpdate: TTimingStateVectorUpdate) => {
        const filteredTimingStateVectorUpdate = filterTimingStateVectorUpdate(timingStateVectorUpdate);
        const translatedTimingStateVector = translateTimingStateVector(
            timingStateVector,
            performance.now() / 1000 - timingStateVector.timestamp
        );

        for (const [key, value] of <[keyof ITimingStateVector, number][]>Object.entries(filteredTimingStateVectorUpdate)) {
            if (value !== translatedTimingStateVector[key]) {
                return { ...translatedTimingStateVector, ...filteredTimingStateVectorUpdate };
            }
        }

        return null;
    };
};
