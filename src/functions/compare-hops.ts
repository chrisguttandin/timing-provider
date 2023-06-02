export const compareHops = ([originA, ...hopsA]: number[], [originB, ...hopsB]: number[]): number => {
    if (originA === undefined || originB === undefined) {
        throw new Error('Every vector should have an origin.');
    }

    if (originA === originB) {
        const duplicatedHopsA = hopsA.filter((hop) => hop === hopsA[0]).length;
        const duplicatedHopsB = hopsB.filter((hop) => hop === hopsB[0]).length;

        if (duplicatedHopsA === duplicatedHopsB) {
            if (duplicatedHopsA === 0) {
                throw new Error('At least one vector should have a hop if they have the same origin.');
            }

            if (duplicatedHopsA === 1 || hopsA[0] === hopsB[0]) {
                if (hopsA.length === hopsB.length) {
                    if (hopsA.every((hop, index) => hop === hopsB[index])) {
                        throw new Error('Every vector should be unique.');
                    }

                    return 0;
                }

                return hopsA.length - hopsB.length;
            }

            return hopsA[0] - hopsB[0];
        }

        return duplicatedHopsA - duplicatedHopsB;
    }

    return originA - originB;
};
