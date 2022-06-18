import { TNativeEventTarget } from '../types';

export const createEventTargetFactory = (window: null | Window): (() => TNativeEventTarget) => {
    return () => {
        if (window === null) {
            throw new Error('A native EventTarget could not be created.');
        }

        return window.document.createElement('p');
    };
};
