import {
    EMPTY,
    Observable,
    OperatorFunction,
    Subject,
    concat,
    count,
    defer,
    finalize,
    from,
    ignoreElements,
    iif,
    interval,
    merge,
    mergeMap,
    of,
    retry,
    switchMap,
    take,
    takeUntil,
    tap,
    throwError,
    timer,
    zip
} from 'rxjs';
import { inexorably } from 'rxjs-etc/operators';
import { on } from 'subscribable-things';
import { createBackoff } from '../functions/create-backoff';
import { IErrorEvent, IPingEvent, IPongEvent, IUpdateEvent } from '../interfaces';
import { TDataChannelTuple, TIncomingNegotiationEvent, TOutgoingSignalingEvent, TSendPeerToPeerMessageFunction } from '../types';
import { echo } from './echo';
import { ignoreLateResult } from './ignore-late-result';

export const negotiateDataChannels =
    (
        createPeerConnection: () => RTCPeerConnection,
        sendSignalingEvent: (event: TOutgoingSignalingEvent) => void
    ): OperatorFunction<[string, boolean, Observable<TIncomingNegotiationEvent>], TDataChannelTuple> =>
    (source) =>
        source.pipe(
            mergeMap(
                ([clientId, isActive, observable]: [string, boolean, Observable<TIncomingNegotiationEvent>]) =>
                    new Observable<TDataChannelTuple>((observer) => {
                        const errorEvents: IErrorEvent[] = [];
                        const errorSubject = new Subject<Error>();
                        const receivedCandidates: RTCIceCandidateInit[] = [];
                        const resetSubject = new Subject();
                        const createAndSendOffer = () => {
                            isFresh = false;

                            return ignoreLateResult(peerConnection.setLocalDescription()).pipe(
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
                        };
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
                            const subscriptions = [
                                zip([on(reliableDataChannel, 'open'), on(unreliableDataChannel, 'open')])
                                    .pipe(take(1))
                                    .subscribe(() => {
                                        send = (event) => {
                                            const dataChannel = event.type === 'update' ? reliableDataChannel : unreliableDataChannel;

                                            try {
                                                dataChannel.send(JSON.stringify(event));
                                            } catch (err) {
                                                errorSubject.next(err);

                                                return false;
                                            }

                                            return true;
                                        };

                                        observer.next([clientId, send]);
                                    }),
                                merge(
                                    ...[reliableDataChannel, unreliableDataChannel]
                                        .map((dataChannel) => ['close', 'closing', 'error'].map((type) => on(dataChannel, type)))
                                        .flat()
                                ).subscribe(({ type }) =>
                                    errorSubject.next(new Error(`RTCDataChannel fired unexpected event of type "${type}".`))
                                )
                            ];

                            const unsubscribeFunctions = [
                                () => subscriptions.forEach((subscription) => subscription.unsubscribe()),
                                on(
                                    reliableDataChannel,
                                    'message'
                                )(({ data }) => {
                                    const event: IUpdateEvent = JSON.parse(data);

                                    observer.next([clientId, event]);
                                }),
                                on(
                                    unreliableDataChannel,
                                    'message'
                                )(({ data, timeStamp }) => {
                                    const event: (IPingEvent | IPongEvent) & { timestamp: number } = {
                                        ...JSON.parse(data),
                                        timestamp: timeStamp ?? performance.now()
                                    };

                                    observer.next([clientId, event]);
                                })
                            ];

                            return () => unsubscribeFunctions.forEach((unsubscribeFunction) => unsubscribeFunction());
                        };
                        const [getBackoff, incrementBackoff] = createBackoff(1);
                        const subscribeToPeerConnection = () => {
                            const subscription = merge(on(peerConnection, 'icecandidate'), on(peerConnection, 'icegatheringstatechange'))
                                .pipe(
                                    switchMap(() =>
                                        iif(
                                            () => peerConnection.iceGatheringState === 'gathering',
                                            defer(() => timer(10_000 * getBackoff())),
                                            EMPTY
                                        )
                                    )
                                )
                                .subscribe(() => {
                                    incrementBackoff();
                                    errorSubject.next(new Error('RTCPeerConnection seems to be stuck at iceGatheringState "gathering".'));
                                });
                            const unsubscribeFunctions = [
                                () => subscription.unsubscribe(),
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
                                    'icecandidateerror'
                                )(({ address, errorCode, errorText, port, url }) =>
                                    sendSignalingEvent({
                                        address,
                                        errorCode,
                                        errorText,
                                        port,
                                        type: 'icecandidateerror',
                                        url
                                    })
                                ),
                                on(
                                    peerConnection,
                                    'iceconnectionstatechange'
                                )(() => {
                                    const iceConnectionState = peerConnection.iceConnectionState;

                                    if (['closed', 'disconnected', 'failed'].includes(iceConnectionState)) {
                                        errorSubject.next(
                                            new Error(
                                                `RTCPeerConnection transitioned to unexpected iceConnectionState "${iceConnectionState}".`
                                            )
                                        );
                                    }
                                }),
                                on(
                                    peerConnection,
                                    'signalingstatechange'
                                )(() => {
                                    if (peerConnection.signalingState === 'closed') {
                                        errorSubject.next(
                                            new Error(`RTCPeerConnection transitioned to unexpected signalingState "closed".`)
                                        );
                                    }
                                })
                            ];

                            return () => unsubscribeFunctions.forEach((unsubscribeFunction) => unsubscribeFunction());
                        };
                        const resetState = (newVersion: number) => {
                            resetSubject.next(null);

                            unsubscribeFromCandidates();
                            unsubscribeFromDataChannels();
                            unsubscribeFromPeerConnection();

                            reliableDataChannel.close();
                            unreliableDataChannel.close();
                            peerConnection.close();

                            if (send !== null) {
                                observer.next([clientId, true]);
                            }

                            isFresh = true;
                            numberOfAppliedCandidates = 0;
                            numberOfExpectedCandidates = version === newVersion ? numberOfExpectedCandidates : Infinity;
                            numberOfGatheredCandidates = 0;
                            peerConnection = createPeerConnection();
                            receivedCandidates.length = version === newVersion ? receivedCandidates.length : 0;
                            reliableDataChannel = peerConnection.createDataChannel('', { id: 0, negotiated: true, ordered: true });
                            send = null;
                            unreliableDataChannel = peerConnection.createDataChannel('', {
                                id: 1,
                                maxRetransmits: 0,
                                negotiated: true,
                                ordered: false
                            });
                            unsubscribeFromCandidates = subscribeToCandidates();
                            unsubscribeFromDataChannels = subscribeToDataChannels();
                            unsubscribeFromPeerConnection = subscribeToPeerConnection();
                            version = newVersion;
                        };

                        let isFresh = true;
                        let numberOfAppliedCandidates = 0;
                        let numberOfExpectedCandidates = Infinity;
                        let numberOfGatheredCandidates = 0;
                        let peerConnection = createPeerConnection();
                        let reliableDataChannel = peerConnection.createDataChannel('', { id: 0, negotiated: true, ordered: true });
                        let send: null | TSendPeerToPeerMessageFunction = null;
                        let unrecoverableError: null | Error = null;
                        let unreliableDataChannel = peerConnection.createDataChannel('', {
                            id: 1,
                            maxRetransmits: 0,
                            negotiated: true,
                            ordered: false
                        });
                        let unsubscribeFromCandidates = subscribeToCandidates();
                        let unsubscribeFromDataChannels = subscribeToDataChannels();
                        let unsubscribeFromPeerConnection = subscribeToPeerConnection();
                        let version = 0;

                        const addFinalCandidate = async (numberOfNewlyAppliedCandidates: number) => {
                            numberOfAppliedCandidates += numberOfNewlyAppliedCandidates;

                            if (numberOfAppliedCandidates === numberOfExpectedCandidates) {
                                await peerConnection.addIceCandidate();
                            }
                        };

                        const jsonifyDescription = (
                            description: RTCSessionDescription | RTCSessionDescriptionInit
                        ): RTCSessionDescriptionInit => (description instanceof RTCSessionDescription ? description.toJSON() : description);

                        const processEvent = (event: TIncomingNegotiationEvent): Observable<unknown> => {
                            const { type } = event;

                            if (type === 'answer' && isActive) {
                                if (version > event.version) {
                                    return EMPTY;
                                }

                                if (version === event.version && !isFresh) {
                                    return ignoreLateResult(peerConnection.setRemoteDescription(event)).pipe(
                                        mergeMap(() => from(receivedCandidates)),
                                        mergeMap((receivedCandidate) =>
                                            ignoreLateResult(peerConnection.addIceCandidate(receivedCandidate))
                                        ),
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

                                if (version < event.version && !isActive) {
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

                            if (type === 'error' && isActive) {
                                if (version > event.version) {
                                    return EMPTY;
                                }

                                resetState(event.version + 1);

                                return createAndSendOffer();
                            }

                            if (type === 'notice' && !isActive) {
                                return EMPTY;
                            }

                            if (type === 'offer' && !isActive) {
                                if (version > event.version) {
                                    return EMPTY;
                                }

                                if (version < event.version) {
                                    resetState(event.version);
                                }

                                isFresh = false;

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

                            if (type === 'request' && isActive) {
                                if (version === 0 && isFresh) {
                                    return createAndSendOffer();
                                }

                                return EMPTY;
                            }

                            if (type === 'summary') {
                                if (version > event.version) {
                                    return EMPTY;
                                }

                                if (version < event.version && !isActive) {
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

                        observer.next([clientId, true]);

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
                                    () => reliableDataChannel.readyState !== 'open' || unreliableDataChannel.readyState !== 'open',
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
                                mergeMap((event) => processEvent(event).pipe(takeUntil(resetSubject))),
                                retry({
                                    delay: (err) => {
                                        if (err === unrecoverableError) {
                                            // tslint:disable-next-line:rxjs-throw-error
                                            return throwError(() => err);
                                        }

                                        errorEvents.length = 0;

                                        if (isFresh) {
                                            resetState(version);
                                        } else {
                                            const errorEvent = <const>{
                                                client: { id: clientId },
                                                type: 'error',
                                                version
                                            };

                                            if (isActive) {
                                                errorEvents.push(errorEvent);
                                            } else {
                                                resetState(version + 1);
                                                sendSignalingEvent(errorEvent);
                                            }
                                        }

                                        return of(null);
                                    }
                                }),
                                takeUntil(concat(observable.pipe(ignoreElements()), of(null))),
                                finalize(() => {
                                    unsubscribeFromCandidates();
                                    unsubscribeFromDataChannels();
                                    unsubscribeFromPeerConnection();

                                    reliableDataChannel.close();
                                    unreliableDataChannel.close();
                                    peerConnection.close();
                                })
                            )
                            .subscribe({
                                complete: () => {
                                    observer.next([clientId, false]);
                                    observer.complete();
                                },
                                error: (err) => observer.error(err)
                            });
                    })
            )
        );
