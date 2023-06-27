import {
    EMPTY,
    Observable,
    Subject,
    count,
    defer,
    finalize,
    from,
    interval,
    map,
    merge,
    mergeMap,
    of,
    retry,
    takeUntil,
    tap,
    throwError
} from 'rxjs';
import { inexorably } from 'rxjs-etc/operators';
import { on } from 'subscribable-things';
import { IErrorEvent } from '../interfaces';
import { TDataChannelEvent, TDataChannelTuple, TIncomingNegotiationEvent, TOutgoingSignalingEvent } from '../types';
import { echo } from './echo';
import { ignoreLateResult } from './ignore-late-result';

export const negotiateDataChannels = (
    createPeerConnection: () => RTCPeerConnection,
    sendSignalingEvent: (event: TOutgoingSignalingEvent) => void
) =>
    map(
        ([clientId, observable]: [string, Observable<TIncomingNegotiationEvent>]) =>
            new Observable<null | TDataChannelTuple>((observer) => {
                const errorEvents: IErrorEvent[] = [];
                const errorSubject = new Subject<Error>();
                const receivedCandidates: RTCIceCandidateInit[] = [];
                const resetSubject = new Subject();
                const createAndSendOffer = () =>
                    ignoreLateResult(peerConnection.setLocalDescription()).pipe(
                        tap(() => {
                            const { localDescription } = peerConnection;

                            if (localDescription === null) {
                                throw new Error('The local description is not set.');
                            }

                            sendSignalingEvent({
                                ...jsonifyDescription(localDescription),
                                client: { id: clientId },
                                version
                            });
                        })
                    );
                const subscribeToCandidates = () =>
                    on(
                        peerConnection,
                        'icecandidate'
                    )(({ candidate }) => {
                        if (candidate === null) {
                            sendSignalingEvent({
                                client: { id: clientId },
                                numberOfGatheredCandidates,
                                type: 'summary',
                                version
                            });
                        } else if (candidate.port !== 9 && candidate.protocol !== 'tcp') {
                            sendSignalingEvent({
                                ...candidate.toJSON(),
                                client: { id: clientId },
                                type: 'candidate',
                                version
                            });

                            numberOfGatheredCandidates += 1;
                        }
                    });
                const subscribeToDataChannels = () => {
                    const unsubscribeFunctions = [
                        on(
                            reliableDataChannel,
                            'close'
                        )(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "close".'))),
                        on(
                            reliableDataChannel,
                            'closing'
                        )(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "closing".'))),
                        on(
                            reliableDataChannel,
                            'error'
                        )(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "error".'))),
                        on(
                            unreliableDataChannel,
                            'close'
                        )(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "close".'))),
                        on(
                            unreliableDataChannel,
                            'closing'
                        )(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "closing".'))),
                        on(
                            unreliableDataChannel,
                            'error'
                        )(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "error".')))
                    ];
                    const channelTuple = <const>[
                        label !== null,
                        from(merge(on(reliableDataChannel, 'message'), on(unreliableDataChannel, 'message'))).pipe(
                            map((event): TDataChannelEvent & { timestamp: number } => ({
                                ...JSON.parse(event.data),
                                timestamp: event.timeStamp ?? performance.now()
                            })),
                            takeUntil(
                                merge(
                                    resetSubject,
                                    on(reliableDataChannel, 'close'),
                                    on(reliableDataChannel, 'closing'),
                                    on(reliableDataChannel, 'error'),
                                    on(unreliableDataChannel, 'close'),
                                    on(unreliableDataChannel, 'closing'),
                                    on(unreliableDataChannel, 'error')
                                )
                            )
                        ),
                        (event: TDataChannelEvent) => {
                            const dataChannel = event.type === 'update' ? reliableDataChannel : unreliableDataChannel;

                            if (dataChannel.readyState === 'open') {
                                dataChannel.send(JSON.stringify(event));
                            }
                        }
                    ];

                    if (reliableDataChannel.readyState === 'open' && unreliableDataChannel.readyState === 'open') {
                        observer.next(channelTuple);
                    } else {
                        unsubscribeFunctions.push(
                            on(
                                reliableDataChannel,
                                'open'
                            )(() => {
                                if (unreliableDataChannel.readyState === 'open') {
                                    observer.next(channelTuple);
                                }
                            }),
                            on(
                                unreliableDataChannel,
                                'open'
                            )(() => {
                                if (reliableDataChannel.readyState === 'open') {
                                    observer.next(channelTuple);
                                }
                            })
                        );
                    }

                    return () => unsubscribeFunctions.forEach((unsubscribeFunction) => unsubscribeFunction());
                };
                const subscribeToPeerConnection = () => {
                    const unsubscribeFunctions = [
                        on(
                            peerConnection,
                            'connectionstatechange'
                        )(() => {
                            const connectionState = peerConnection.connectionState;

                            if (['closed', 'disconnected', 'failed'].includes(connectionState)) {
                                errorSubject.next(
                                    new Error(`RTCPeerConnection transitioned to unexpected connectionState "${connectionState}".`)
                                );
                            }
                        }),
                        on(
                            peerConnection,
                            'iceconnectionstatechange'
                        )(() => {
                            const iceConnectionState = peerConnection.iceConnectionState;

                            if (['closed', 'disconnected', 'failed'].includes(iceConnectionState)) {
                                errorSubject.next(
                                    new Error(`RTCPeerConnection transitioned to unexpected iceConnectionState "${iceConnectionState}".`)
                                );
                            }
                        }),
                        on(
                            peerConnection,
                            'signalingstatechange'
                        )(() => {
                            if (peerConnection.signalingState === 'closed') {
                                errorSubject.next(new Error(`RTCPeerConnection transitioned to unexpected signalingState "closed".`));
                            }
                        })
                    ];

                    return () => unsubscribeFunctions.forEach((unsubscribeFunction) => unsubscribeFunction());
                };
                const resetState = (newVersion: number) => {
                    unsubscribeFromCandidates();
                    unsubscribeFromDataChannel();
                    unsubscribeFromPeerConnection();

                    resetSubject.next(null);

                    if (reliableDataChannel.readyState === 'open' || unreliableDataChannel.readyState === 'open') {
                        observer.next(null);
                    }

                    reliableDataChannel.close();
                    unreliableDataChannel.close();
                    peerConnection.close();

                    numberOfAppliedCandidates = 0;
                    numberOfExpectedCandidates = Infinity;
                    numberOfGatheredCandidates = 0;
                    peerConnection = createPeerConnection();
                    receivedCandidates.length = 0;
                    reliableDataChannel = peerConnection.createDataChannel('', { id: 0, negotiated: true, ordered: true });
                    unreliableDataChannel = peerConnection.createDataChannel('', {
                        id: 1,
                        maxRetransmits: 0,
                        negotiated: true,
                        ordered: false
                    });
                    unsubscribeFromCandidates = subscribeToCandidates();
                    unsubscribeFromDataChannel = subscribeToDataChannels();
                    unsubscribeFromPeerConnection = subscribeToPeerConnection();
                    version = newVersion;
                };

                let label: null | string = null;
                let numberOfAppliedCandidates = 0;
                let numberOfExpectedCandidates = Infinity;
                let numberOfGatheredCandidates = 0;
                let peerConnection = createPeerConnection();
                let reliableDataChannel = peerConnection.createDataChannel('', { id: 0, negotiated: true, ordered: true });
                let unrecoverableError: null | Error = null;
                let unreliableDataChannel = peerConnection.createDataChannel('', {
                    id: 1,
                    maxRetransmits: 0,
                    negotiated: true,
                    ordered: false
                });
                let unsubscribeFromCandidates = subscribeToCandidates();
                let unsubscribeFromDataChannel = subscribeToDataChannels();
                let unsubscribeFromPeerConnection = subscribeToPeerConnection();
                let version = 0;

                const addFinalCandidate = async (numberOfNewlyAppliedCandidates: number) => {
                    numberOfAppliedCandidates += numberOfNewlyAppliedCandidates;

                    if (numberOfAppliedCandidates === numberOfExpectedCandidates) {
                        await peerConnection.addIceCandidate();
                    }
                };

                const jsonifyDescription = (description: RTCSessionDescription | RTCSessionDescriptionInit): RTCSessionDescriptionInit =>
                    description instanceof RTCSessionDescription ? description.toJSON() : description;

                const processEvent = (event: TIncomingNegotiationEvent): Observable<unknown> => {
                    const { type } = event;

                    if (type === 'answer' && label !== null) {
                        if (version > event.version) {
                            return EMPTY;
                        }

                        if (version === event.version) {
                            return ignoreLateResult(peerConnection.setRemoteDescription(event)).pipe(
                                mergeMap(() => from(receivedCandidates)),
                                mergeMap((receivedCandidate) => ignoreLateResult(peerConnection.addIceCandidate(receivedCandidate))),
                                count(),
                                mergeMap((numberOfNewlyAppliedCandidates) =>
                                    ignoreLateResult(addFinalCandidate(numberOfNewlyAppliedCandidates))
                                )
                            );
                        }
                    }

                    if (type === 'candidate') {
                        if (version > event.version) {
                            return EMPTY;
                        }

                        if (label === null && version < event.version) {
                            resetState(event.version);
                        }

                        if (version === event.version) {
                            if (peerConnection.remoteDescription === null) {
                                receivedCandidates.push(event);

                                return EMPTY;
                            }

                            return ignoreLateResult(peerConnection.addIceCandidate(event)).pipe(
                                mergeMap(() => ignoreLateResult(addFinalCandidate(1)))
                            );
                        }
                    }

                    if (type === 'error' && label !== null) {
                        if (version > event.version) {
                            return EMPTY;
                        }

                        resetState(event.version + 1);

                        return createAndSendOffer();
                    }

                    if (type === 'notice' && label === null) {
                        return EMPTY;
                    }

                    if (type === 'offer' && label === null) {
                        if (version > event.version) {
                            return EMPTY;
                        }

                        if (version < event.version) {
                            resetState(event.version);
                        }

                        return ignoreLateResult(peerConnection.setRemoteDescription(event)).pipe(
                            mergeMap(() =>
                                merge(
                                    ignoreLateResult(peerConnection.setLocalDescription()).pipe(
                                        tap(() => {
                                            const { localDescription } = peerConnection;

                                            if (localDescription === null) {
                                                throw new Error('The local description is not set.');
                                            }

                                            sendSignalingEvent({
                                                ...jsonifyDescription(localDescription),
                                                client: { id: clientId },
                                                version
                                            });
                                        })
                                    ),
                                    from(receivedCandidates).pipe(
                                        mergeMap((receivedCandidate) =>
                                            ignoreLateResult(peerConnection.addIceCandidate(receivedCandidate))
                                        ),
                                        count(),
                                        mergeMap((numberOfNewlyAppliedCandidates) =>
                                            ignoreLateResult(addFinalCandidate(numberOfNewlyAppliedCandidates))
                                        )
                                    )
                                )
                            )
                        );
                    }

                    if (type === 'request' && label === event.label) {
                        return EMPTY;
                    }

                    if (type === 'request' && label === null && version === 0) {
                        label = event.label;

                        return createAndSendOffer();
                    }

                    if (type === 'summary') {
                        if (version > event.version) {
                            return EMPTY;
                        }

                        if (label === null && version < event.version) {
                            resetState(event.version);
                        }

                        if (version === event.version) {
                            numberOfExpectedCandidates = event.numberOfGatheredCandidates;

                            return ignoreLateResult(addFinalCandidate(0));
                        }
                    }

                    unrecoverableError = new Error(`The current event of type "${type}" can't be processed.`);

                    // tslint:disable-next-line:rxjs-throw-error
                    return throwError(() => unrecoverableError);
                };

                observer.next(null);

                return merge(
                    defer(() => from(errorEvents)),
                    // tslint:disable-next-line:rxjs-throw-error
                    errorSubject.pipe(mergeMap((err) => throwError(() => err))),
                    observable.pipe(
                        echo(
                            () =>
                                sendSignalingEvent({
                                    client: { id: clientId },
                                    type: 'check'
                                }),
                            () => reliableDataChannel.readyState === 'connecting' || unreliableDataChannel.readyState === 'connecting',
                            interval(5000)
                        ),
                        inexorably((notification) => {
                            if (notification !== undefined) {
                                errorSubject.complete();
                            }
                        })
                    )
                )
                    .pipe(
                        mergeMap((event) =>
                            processEvent(event).pipe(takeUntil(merge(resetSubject, concat(subject.pipe(ignoreElements()), of(null)))))
                        ),
                        retry({
                            delay: (err) => {
                                if (err === unrecoverableError) {
                                    // tslint:disable-next-line:rxjs-throw-error
                                    return throwError(() => err);
                                }

                                errorEvents.length = 0;

                                const errorEvent = <const>{
                                    client: { id: clientId },
                                    type: 'error',
                                    version
                                };

                                if (label === null) {
                                    sendSignalingEvent(errorEvent);
                                    resetState(version + 1);
                                } else {
                                    errorEvents.push(errorEvent);
                                }

                                return of(null);
                            }
                        }),
                        finalize(() => {
                            unsubscribeFromCandidates();
                            unsubscribeFromDataChannel();
                            unsubscribeFromPeerConnection();

                            reliableDataChannel.close();
                            unreliableDataChannel.close();
                            peerConnection.close();
                        })
                    )
                    .subscribe({ complete: () => observer.complete(), error: (err) => observer.error(err) });
            })
    );
