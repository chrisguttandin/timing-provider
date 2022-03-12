import { Observable, Subject, mergeMap } from 'rxjs';
import { on } from 'subscribable-things';
import { ICandidateEvent, IDescriptionEvent, IRequestEvent, ISummaryEvent } from '../interfaces';
import { TClientEvent } from '../types';

export const negotiateDataChannels = (createPeerConnection: () => RTCPeerConnection, webSocket: WebSocket) =>
    mergeMap(
        (subject: Subject<IRequestEvent | ICandidateEvent | IDescriptionEvent | ISummaryEvent>) =>
            new Observable<RTCDataChannel>((observer) => {
                const peerConnection = createPeerConnection();
                const receivedCandidates: RTCIceCandidateInit[] = [];
                const send = (event: TClientEvent) => webSocket.send(JSON.stringify(event));
                const unprocessedEvents: (IRequestEvent | ICandidateEvent | IDescriptionEvent | ISummaryEvent)[] = [];

                let isActive: boolean;
                let mask: IRequestEvent['message']['mask'];
                let numberOfAppliedCandidates = 0;
                let numberOfExpectedCandidates = Infinity;
                let numberOfGatheredCandidates = 0;

                peerConnection.addEventListener('icecandidate', ({ candidate }) => {
                    if (candidate === null) {
                        send({
                            client: { id: mask.client.id },
                            message: {
                                message: {
                                    numberOfGatheredCandidates
                                },
                                type: 'summary'
                            },
                            token: mask.token,
                            type: undefined
                        });
                    } else {
                        send({
                            client: { id: mask.client.id },
                            message: {
                                message: {
                                    candidate
                                },
                                type: 'candidate'
                            },
                            token: mask.token,
                            type: undefined
                        });

                        numberOfGatheredCandidates += 1;
                    }
                });

                const emitChannel = (channel: RTCDataChannel): void => {
                    subject.complete();
                    observer.next(channel);
                    observer.complete();
                };

                const addFinalCandidate = async (numberOfNewlyAppliedCandidates: number) => {
                    numberOfAppliedCandidates += numberOfNewlyAppliedCandidates;

                    if (numberOfAppliedCandidates === numberOfExpectedCandidates) {
                        await peerConnection.addIceCandidate();
                    }
                };

                const processEvent = (event: IRequestEvent | ICandidateEvent | IDescriptionEvent | ISummaryEvent) => {
                    if (event.message.type === 'candidate') {
                        if (peerConnection.remoteDescription === null) {
                            receivedCandidates.push(event.message.message.candidate);
                        } else {
                            peerConnection.addIceCandidate(event.message.message.candidate).then(() => addFinalCandidate(1));
                        }
                    } else if (event.message.type === 'description') {
                        peerConnection.setRemoteDescription(event.message.message.description).then(async () => {
                            await Promise.all(receivedCandidates.map((candidate) => peerConnection.addIceCandidate(candidate)));
                            await addFinalCandidate(receivedCandidates.length);

                            if (!isActive) {
                                const description = await peerConnection.createAnswer();

                                await peerConnection.setLocalDescription(description);

                                send({
                                    client: { id: mask.client.id },
                                    message: {
                                        message: {
                                            description
                                        },
                                        type: 'description'
                                    },
                                    token: mask.token,
                                    type: undefined
                                });
                            }
                        });
                    } else if (event.type === 'request') {
                        mask = event.message.mask;
                        isActive = event.message.isActive;

                        if (event.message.isActive) {
                            const dataChannel = peerConnection.createDataChannel(event.message.label, { ordered: true });

                            const unsubscribe = on(
                                dataChannel,
                                'open'
                            )(() => {
                                unsubscribe();
                                emitChannel(dataChannel);
                            });

                            peerConnection.createOffer().then(async (description) => {
                                await peerConnection.setLocalDescription(description);

                                send({
                                    client: { id: event.message.mask.client.id },
                                    message: {
                                        message: {
                                            description
                                        },
                                        type: 'description'
                                    },
                                    token: event.message.mask.token,
                                    type: undefined
                                });
                            });
                        } else {
                            const unsubscribe = on(
                                peerConnection,
                                'datachannel'
                            )(({ channel }) => {
                                unsubscribe();
                                emitChannel(channel);
                            });
                        }

                        unprocessedEvents.forEach(processEvent);
                        unprocessedEvents.length = 0;
                    } else if (event.message.type === 'summary') {
                        numberOfExpectedCandidates = event.message.message.numberOfGatheredCandidates;

                        addFinalCandidate(0);
                    }
                };

                return subject.subscribe({
                    complete: () => observer.complete(),
                    error: (err) => observer.error(err),
                    next: (event) => processEvent(event)
                });
            })
    );
