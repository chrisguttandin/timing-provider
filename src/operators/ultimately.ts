import { MonoTypeOperatorFunction, Observable } from 'rxjs';

export const ultimately =
    <Value>(callback: () => void): MonoTypeOperatorFunction<Value> =>
    (source) =>
        new Observable<Value>((observer) => {
            const subscription = source.subscribe({
                complete: () => {
                    callback();
                    observer.complete();
                },
                error: (err) => {
                    callback();
                    observer.error(err);
                },
                next: (value) => observer.next(value)
            });

            return () => {
                callback();
                subscription.unsubscribe();
            };
        });
