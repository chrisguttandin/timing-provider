import { Observable, OperatorFunction, Subject, Subscription, finalize, last, take } from 'rxjs';
import { IRequestEvent, ITerminationEvent } from '../interfaces';
import { TClientEvent } from '../types';

export const demultiplexMessages =
    (
        timer: Observable<unknown>
    ): OperatorFunction<IRequestEvent | ITerminationEvent | TClientEvent, [string, Subject<IRequestEvent | TClientEvent>]> =>
    (source) =>
        new Observable<[string, Subject<IRequestEvent | TClientEvent>]>((observer) => {
            const subjects = new Map<string, [null | Subject<IRequestEvent | TClientEvent>, Subscription]>();

            const completeAll = () => {
                subjects.forEach(([subject, subscription]) => {
                    subscription.unsubscribe();

                    if (subject !== null) {
                        subject.complete();
                    }
                });
            };

            return source.pipe(finalize(() => completeAll())).subscribe({
                complete(): void {
                    observer.complete();
                },
                error(err): void {
                    observer.error(err);
                },
                next(event): void {
                    const remoteClientId = event.client.id;
                    const [subject, subscription] = subjects.get(remoteClientId) ?? [null, null];

                    if (event.type === 'termination') {
                        if (subscription !== null) {
                            subscription.unsubscribe();
                        }

                        if (subject !== null) {
                            subject.complete();
                        }

                        subjects.set(remoteClientId, [null, timer.pipe(take(1)).subscribe(() => subjects.delete(remoteClientId))]); // tslint:disable-line:rxjs-no-nested-subscribe
                    } else {
                        if (subject === null && subscription === null) {
                            const newSubject = new Subject<IRequestEvent | TClientEvent>();

                            subjects.set(remoteClientId, [
                                newSubject,
                                newSubject.pipe(last()).subscribe(() => subjects.delete(remoteClientId)) // tslint:disable-line:rxjs-no-nested-subscribe
                            ]);
                            observer.next([remoteClientId, newSubject]);
                            newSubject.next(event);
                        } else if (subject !== null) {
                            subject.next(event);
                        }
                    }
                }
            });
        });
