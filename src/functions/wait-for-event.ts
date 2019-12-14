import { Observable } from 'rxjs';
import { TWaitForEventFunction } from '../types';

export const waitForEvent: TWaitForEventFunction = (eventTarget, type) => {
    return new Observable((observer) => {
        const emitDataChannel = () => {
            eventTarget.removeEventListener(type, emitDataChannel);

            observer.next(eventTarget);
            observer.complete();
        };

        eventTarget.addEventListener(type, emitDataChannel);

        return () => eventTarget.removeEventListener(type, emitDataChannel);
    });
};
