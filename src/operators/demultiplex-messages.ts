import { Observable, OperatorFunction, Subject, Subscription, last } from 'rxjs';
import { IRequestEvent, ITerminationEvent } from '../interfaces';
import { TClientEvent } from '../types';

export const demultiplexMessages =
    (
        timer: () => Observable<unknown>
    ): OperatorFunction<TClientEvent | IRequestEvent | ITerminationEvent, Subject<TClientEvent | IRequestEvent>> =>
    (source) =>
        new Observable<Subject<TClientEvent | IRequestEvent>>((observer) => {
            const subjects = new Map<string, [null | Subject<TClientEvent | IRequestEvent>, Subscription]>();

            const clearAll = () => {
                subjects.forEach(([subject, subscription]) => {
                    subscription.unsubscribe();

                    if (subject !== null) {
                        subject.complete();
                    }
                });
            };

            return source.subscribe({
                complete(): void {
                    clearAll();
                    observer.complete();
                },
                error(err): void {
                    clearAll();
                    observer.error(err);
                },
                next(event): void {
                    const token = event.type === 'request' ? event.message.mask.token : event.token;
                    const [subject, subscription] = subjects.get(token) ?? [null, null];

                    if (event.message.type === 'termination') {
                        if (subscription !== null) {
                            subscription.unsubscribe();
                        }

                        if (subject !== null) {
                            subject.complete();
                        }

                        subjects.set(token, [null, timer().subscribe(() => subjects.delete(token))]); // tslint:disable-line:rxjs-no-nested-subscribe
                    } else {
                        if (subject === null && subscription === null) {
                            const newSubject = new Subject<TClientEvent | IRequestEvent>();

                            subjects.set(token, [
                                newSubject,
                                newSubject.pipe(last()).subscribe(() => subjects.delete(token)) // tslint:disable-line:rxjs-no-nested-subscribe
                            ]);
                            observer.next(newSubject);
                            newSubject.next(<TClientEvent | IRequestEvent>event);
                        } else if (subject !== null) {
                            subject.next(<TClientEvent | IRequestEvent>event);
                        }
                    }
                }
            });
        });
