import { Observable, OperatorFunction, Subject, Subscription, skip, take } from 'rxjs';
import { ITerminationEvent } from '../interfaces';
import { TIncomingNegotiationEvent } from '../types';
import { ultimately } from './ultimately';

export const demultiplexMessages =
    (
        getClientId: () => string,
        timer: Observable<unknown>
    ): OperatorFunction<TIncomingNegotiationEvent | ITerminationEvent, [string, Observable<TIncomingNegotiationEvent>]> =>
    (source) =>
        new Observable<[string, Observable<TIncomingNegotiationEvent>]>((observer) => {
            const subjects = new Map<string, [Subject<TIncomingNegotiationEvent>, null] | [null, Subscription]>();

            const completeAll = () => {
                subjects.forEach(([subject, subscription]) => {
                    if (subject === null) {
                        subscription.unsubscribe();
                    } else {
                        subject.complete();
                    }
                });
            };

            return source.pipe(ultimately(() => completeAll())).subscribe({
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

                        subjects.set(remoteClientId, [
                            null,
                            timer
                                .pipe(skip(getClientId() < remoteClientId ? 1 : 0), take(1))
                                .subscribe(() => subjects.delete(remoteClientId)) // tslint:disable-line:rxjs-no-nested-subscribe
                        ]);
                    } else {
                        if (subject === null && subscription === null) {
                            const newSubject = new Subject<TIncomingNegotiationEvent>();

                            subjects.set(remoteClientId, [newSubject, null]);
                            observer.next([remoteClientId, newSubject]);
                            newSubject.next(event);
                        } else if (subject !== null) {
                            subject.next(event);
                        }
                    }
                }
            });
        });
