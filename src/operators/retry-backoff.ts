import { MonoTypeOperatorFunction, concatMap, defer, iif, retryWhen, throwError, timer } from 'rxjs';

export const retryBackoff =
    <T>(): MonoTypeOperatorFunction<T> =>
    (source) =>
        defer(() => {
            const attempts = 4;
            const interval = 1000;

            let index = 0;

            return source.pipe(
                retryWhen((errors) =>
                    errors.pipe(
                        concatMap((error) => {
                            index += 1;

                            return iif(
                                () => index < attempts,
                                timer(interval * index ** 2),
                                throwError(() => error) // tslint:disable-line:rxjs-throw-error
                            );
                        })
                    )
                )
            );
        });
