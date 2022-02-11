import { scan } from 'rxjs';

export const maintainArray = <T>() =>
    scan<[T, boolean], T[]>((array, [value]) => {
        const index = array.indexOf(value);

        if (index > -1) {
            return [...array.slice(0, index), ...array.slice(index + 1)];
        }

        return [...array, value];
    }, []);
