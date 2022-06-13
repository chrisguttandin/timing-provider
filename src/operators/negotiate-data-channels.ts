import {
    EMPTY,
    Observable,
    Subject,
    concatMap,
    count,
    defer,
    filter,
    finalize,
    from,
    iif,
    interval,
    map,
    merge,
    mergeMap,
    of,
    retry,
    switchMap,
    takeUntil,
    tap,
    throwError,
    timer
} from 'rxjs';
import { inexorably } from 'rxjs-etc/operators';
import { TUnsubscribeFunction, on } from 'subscribable-things';
import { ICheckEvent, IErrorEvent, IRequestEvent } from '../interfaces';
import { TClientEvent, TDataChannelEvent, TDataChannelTuple } from '../types';
import { echo } from './echo';
import { ignoreLateResult } from './ignore-late-result';

export const negotiateDataChannels = (createPeerConnection: () => RTCPeerConnection, webSocket: WebSocket) =>
    map(
        ([clientId, subject]: [string, Observable<IRequestEvent | TClientEvent>]) =>
            new Observable<null | TDataChannelTuple>((observer) => {
                const errorEvents: IErrorEvent[] = [];
                const errorSubject = new Subject<Error>();
                const receivedCandidates: RTCIceCandidateInit[] = [];
                const createAndSendOffer = () =>
                    ignoreLateResult(peerConnection.createOffer()).pipe(
                        mergeMap((offer) =>
                            ignoreLateResult(peerConnection.setLocalDescription(offer)).pipe(
                                tap(() =>
                                    send({
                                        ...jsonifyDescription(offer),
                                        client: { id: clientId },
                                        version
                                    })
                                )
                            )
                        )
                    );
                const send = (event: ICheckEvent | TClientEvent) => webSocket.send(JSON.stringify(event));
                const subscribeToCandidates = () =>
                    on(
                        peerConnection,
                        'icecandidate'
                    )(({ candidate }) => {
                        if (candidate === null) {
                            send({
                                client: { id: clientId },
                                numberOfGatheredCandidates,
                                type: 'summary',
                                version
                            });
                        } else if (candidate.port !== 9 && candidate.protocol !== 'tcp') {
                            send({
                                ...candidate.toJSON(),
                                client: { id: clientId },
                                type: 'candidate',
                                version
                            });

                            numberOfGatheredCandidates += 1;
                        }
                    });
                const subscribeToDataChannel = (channel: RTCDataChannel) => {
                    const unsubscribeFunctions = [
                        on(channel, 'close')(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "close".'))),
                        on(
                            channel,
                            'closing'
                        )(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "closing".'))),
                        on(channel, 'error')(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "error".')))
                    ];
                    const channelTuple = <const>[
                        label !== null,
                        from(on(channel, 'message')).pipe(
                            map((event) => <TDataChannelEvent>JSON.parse(event.data)),
                            takeUntil(merge(on(channel, 'close'), on(channel, 'closing'), on(channel, 'error')))
                        ),
                        (event: TDataChannelEvent) => {
                            if (channel.readyState === 'open') {
                                channel.send(JSON.stringify(event));
                            }
                        }
                    ];

                    if (channel.readyState === 'open') {
                        observer.next(channelTuple);
                    } else {
                        unsubscribeFunctions.push(on(channel, 'open')(() => observer.next(channelTuple)));
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
                            'datachannel'
                        )(({ channel }) => {
                            dataChannel = channel;

                            unsubscribeFromDataChannel = subscribeToDataChannel(channel);
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
                    unsubscribeFromDataChannel?.();
                    unsubscribeFromPeerConnection();

                    if (dataChannel?.readyState === 'open') {
                        observer.next(null);
                    }

                    dataChannel?.close();
                    peerConnection.close();

                    dataChannel = null;
                    numberOfAppliedCandidates = 0;
                    numberOfExpectedCandidates = Infinity;
                    numberOfGatheredCandidates = 0;
                    peerConnection = createPeerConnection();
                    receivedCandidates.length = 0;
                    unsubscribeFromCandidates = subscribeToCandidates();
                    unsubscribeFromDataChannel = null;
                    unsubscribeFromPeerConnection = subscribeToPeerConnection();
                    version = newVersion;
                };

                let dataChannel: null | RTCDataChannel = null;
                let label: null | string = null;
                let numberOfAppliedCandidates = 0;
                let numberOfExpectedCandidates = Infinity;
                let numberOfGatheredCandidates = 0;
                let peerConnection = createPeerConnection();
                let unrecoverableError: null | Error = null;
                let unsubscribeFromCandidates = subscribeToCandidates();
                let unsubscribeFromDataChannel: null | TUnsubscribeFunction = null;
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

                const processEvent = (event: IRequestEvent | TClientEvent): Observable<unknown> => {
                    const { type } = event;

                    if (type === 'answer' && label !== null) {
                        if (version > event.version) {
                            return EMPTY;
                        }

                        if (version === event.version) {
                            return ignoreLateResult(peerConnection.setRemoteDescription(event)).pipe(
                                mergeMap(() => from(receivedCandidates)),
                                concatMap((receivedCandidate) => ignoreLateResult(peerConnection.addIceCandidate(receivedCandidate))),
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

                        dataChannel = peerConnection.createDataChannel(label, { ordered: true });
                        unsubscribeFromDataChannel = subscribeToDataChannel(dataChannel);

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
                            mergeMap(() => ignoreLateResult(peerConnection.createAnswer())),
                            mergeMap((answer) =>
                                ignoreLateResult(peerConnection.setLocalDescription(answer)).pipe(
                                    tap(() =>
                                        send({
                                            ...jsonifyDescription(answer),
                                            client: { id: clientId },
                                            version
                                        })
                                    )
                                )
                            ),
                            mergeMap(() => from(receivedCandidates)),
                            concatMap((receivedCandidate) => ignoreLateResult(peerConnection.addIceCandidate(receivedCandidate))),
                            count(),
                            mergeMap((numberOfNewlyAppliedCandidates) =>
                                ignoreLateResult(addFinalCandidate(numberOfNewlyAppliedCandidates))
                            )
                        );
                    }

                    if (type === 'request' && label === event.label) {
                        return EMPTY;
                    }

                    if (type === 'request' && dataChannel === null && label === null && version === 0) {
                        label = event.label;

                        dataChannel = peerConnection.createDataChannel(label, { ordered: true });
                        unsubscribeFromDataChannel = subscribeToDataChannel(dataChannel);

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
                    subject.pipe(
                        echo(
                            () =>
                                send({
                                    client: { id: clientId },
                                    type: 'check'
                                }),
                            () => dataChannel === null || dataChannel.readyState === 'connecting',
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
                        concatMap((event) => processEvent(event)),
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
                                    send(errorEvent);
                                    resetState(version + 1);
                                } else {
                                    errorEvents.push(errorEvent);
                                }

                                return of(null);
                            }
                        }),
                        finalize(() => {
                            unsubscribeFromCandidates();
                            unsubscribeFromDataChannel?.();
                            unsubscribeFromPeerConnection();

                            dataChannel?.close();
                            peerConnection.close();
                        })
                    )
                    .subscribe({ complete: () => observer.complete(), error: (err) => observer.error(err) });
            })
    );
