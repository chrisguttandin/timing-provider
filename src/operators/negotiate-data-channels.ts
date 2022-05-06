import { Observable, Subject, concatMap, defer, finalize, from, merge, mergeMap, of, retry, throwError } from 'rxjs';
import { TUnsubscribeFunction, on } from 'subscribable-things';
import { IErrorEvent, IRequestEvent } from '../interfaces';
import { TClientEvent } from '../types';

export const negotiateDataChannels = (createPeerConnection: () => RTCPeerConnection, webSocket: WebSocket) =>
    mergeMap(
        ([clientId, subject]: [string, Subject<IRequestEvent | TClientEvent>]) =>
            new Observable<[RTCDataChannel, boolean]>((observer) => {
                const errorEvents: IErrorEvent[] = [];
                const errorSubject = new Subject<Error>();
                const receivedCandidates: RTCIceCandidateInit[] = [];
                const createAndSendOffer = () =>
                    peerConnection.createOffer().then(async (offer) => {
                        await peerConnection.setLocalDescription(offer);

                        send({
                            ...jsonifyDescription(offer),
                            client: { id: clientId },
                            version
                        });
                    });
                const send = (event: TClientEvent) => webSocket.send(JSON.stringify(event));
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
                        } else {
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
                        on(channel, 'error')(() => errorSubject.next(new Error('RTCDataChannel fired unexpected event of type "error".')))
                    ];

                    if (channel.readyState === 'open') {
                        observer.next([channel, label !== null]);
                    } else {
                        unsubscribeFunctions.push(on(channel, 'open')(() => observer.next([channel, label !== null])));
                    }

                    return () => unsubscribeFunctions.forEach((unsubscribeFunction) => unsubscribeFunction());
                };
                const subscribeToPeerConnection = () => {
                    const unsubscribeFunctions = [
                        on(
                            peerConnection,
                            'connectionState'
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

                const processEvent = (event: IRequestEvent | TClientEvent): Promise<void> => {
                    const { type } = event;

                    if (type === 'answer' && label !== null) {
                        if (version > event.version) {
                            return Promise.resolve();
                        }

                        if (version === event.version) {
                            return peerConnection.setRemoteDescription(event).then(async () => {
                                await Promise.all(receivedCandidates.map((candidate) => peerConnection.addIceCandidate(candidate)));
                                await addFinalCandidate(receivedCandidates.length);
                            });
                        }
                    }

                    if (type === 'candidate') {
                        if (version > event.version) {
                            return Promise.resolve();
                        }

                        if (label === null && version < event.version) {
                            resetState(event.version);
                        }

                        if (version === event.version) {
                            if (peerConnection.remoteDescription === null) {
                                receivedCandidates.push(event);

                                return Promise.resolve();
                            }

                            return peerConnection.addIceCandidate(event).then(() => addFinalCandidate(1));
                        }
                    }

                    if (type === 'error' && label !== null) {
                        if (version > event.version) {
                            return Promise.resolve();
                        }

                        resetState(event.version + 1);

                        dataChannel = peerConnection.createDataChannel(label, { ordered: true });
                        unsubscribeFromDataChannel = subscribeToDataChannel(dataChannel);

                        return createAndSendOffer();
                    }

                    if (type === 'offer' && label === null) {
                        if (version > event.version) {
                            return Promise.resolve();
                        }

                        if (version < event.version) {
                            resetState(event.version);
                        }

                        return peerConnection.setRemoteDescription(event).then(async () => {
                            await Promise.all(receivedCandidates.map((candidate) => peerConnection.addIceCandidate(candidate)));
                            await addFinalCandidate(receivedCandidates.length);

                            const answer = await peerConnection.createAnswer();

                            await peerConnection.setLocalDescription(answer);

                            send({
                                ...jsonifyDescription(answer),
                                client: { id: clientId },
                                version
                            });
                        });
                    }

                    if (type === 'request' && label === event.label) {
                        return Promise.resolve();
                    }

                    if (type === 'request' && dataChannel === null && label === null && version === 0) {
                        label = event.label;

                        dataChannel = peerConnection.createDataChannel(label, { ordered: true });
                        unsubscribeFromDataChannel = subscribeToDataChannel(dataChannel);

                        return createAndSendOffer();
                    }

                    if (type === 'summary') {
                        if (version > event.version) {
                            return Promise.resolve();
                        }

                        if (label === null && version < event.version) {
                            resetState(event.version);
                        }

                        if (version === event.version) {
                            numberOfExpectedCandidates = event.numberOfGatheredCandidates;

                            return addFinalCandidate(0);
                        }
                    }

                    unrecoverableError = new Error(`The current event of type "${type}" can't be processed.`);

                    return Promise.reject(unrecoverableError);
                };

                return merge(
                    defer(() => from(errorEvents)),
                    // tslint:disable-next-line:rxjs-throw-error
                    errorSubject.pipe(mergeMap((err) => throwError(() => err))),
                    subject.pipe(finalize(() => errorSubject.complete()))
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
