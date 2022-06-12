import { Observable } from 'rxjs';

export const ignoreLateResult = <T>(promise: Promise<T>) =>
    new Observable<T>((observer) => {
        let isActive = true;

        promise.then(
            (value) => {
                if (isActive) {
                    observer.next(value);
                    observer.complete();
                }
            },
            (err) => {
                if (isActive) {
                    observer.error(err);
                }
            }
        );

        return () => (isActive = false);
    });
