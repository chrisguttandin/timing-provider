import { scan } from 'rxjs';

export const maintainArray = <T>() =>
    scan<[T, boolean], T[]>((array, [value, isNewValue]) => {
        const index = array.indexOf(value);

        if (index > -1) {
            if (isNewValue) {
                throw new Error('The array does already contain the value to be added.');
            }

            return [...array.slice(0, index), ...array.slice(index + 1)];
        }

        if (!isNewValue) {
            throw new Error("The array doesn't contain the value to be removed.");
        }

        return [...array, value];
    }, []);
