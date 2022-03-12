import { Observable, Subject, mergeMap } from 'rxjs';
import { on } from 'subscribable-things';
import { IAnswerEvent, ICandidateEvent, IOfferEvent, IRequestEvent, ISummaryEvent } from '../interfaces';
import { TClientEvent } from '../types';

export const negotiateDataChannels = (createPeerConnection: () => RTCPeerConnection, webSocket: WebSocket) =>
    mergeMap(
        (subject: Subject<IAnswerEvent | ICandidateEvent | IOfferEvent | IRequestEvent | ISummaryEvent>) =>
            new Observable<RTCDataChannel>((observer) => {
                const peerConnection = createPeerConnection();
                const receivedCandidates: RTCIceCandidateInit[] = [];
                const send = (event: TClientEvent) => webSocket.send(JSON.stringify(event));

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

                const processEvent = (event: IAnswerEvent | ICandidateEvent | IOfferEvent | IRequestEvent | ISummaryEvent) => {
                    if (event.message.type === 'answer') {
                        peerConnection.setRemoteDescription(event.message.message.answer).then(async () => {
                            await Promise.all(receivedCandidates.map((candidate) => peerConnection.addIceCandidate(candidate)));
                            await addFinalCandidate(receivedCandidates.length);
                        });
                    } else if (event.message.type === 'candidate') {
                        if (peerConnection.remoteDescription === null) {
                            receivedCandidates.push(event.message.message.candidate);
                        } else {
                            peerConnection.addIceCandidate(event.message.message.candidate).then(() => addFinalCandidate(1));
                        }
                    } else if (event.message.type === 'offer') {
                        mask = { client: { id: event.client?.id ?? '' } };

                        const unsubscribe = on(
                            peerConnection,
                            'datachannel'
                        )(({ channel }) => {
                            unsubscribe();
                            emitChannel(channel);
                        });

                        peerConnection.setRemoteDescription(event.message.message.offer).then(async () => {
                            await Promise.all(receivedCandidates.map((candidate) => peerConnection.addIceCandidate(candidate)));
                            await addFinalCandidate(receivedCandidates.length);

                            const answer = await peerConnection.createAnswer();

                            await peerConnection.setLocalDescription(answer);

                            send({
                                client: { id: mask.client.id },
                                message: {
                                    message: {
                                        answer
                                    },
                                    type: 'answer'
                                },
                                type: undefined
                            });
                        });
                    } else if (event.type === 'request') {
                        if (mask !== undefined) {
                            return;
                        }

                        mask = event.message.mask;

                        const dataChannel = peerConnection.createDataChannel(event.message.label, { ordered: true });

                        const unsubscribe = on(
                            dataChannel,
                            'open'
                        )(() => {
                            unsubscribe();
                            emitChannel(dataChannel);
                        });

                        peerConnection.createOffer().then(async (offer) => {
                            await peerConnection.setLocalDescription(offer);

                            send({
                                client: { id: event.message.mask.client.id },
                                message: {
                                    message: {
                                        offer
                                    },
                                    type: 'offer'
                                },
                                type: undefined
                            });
                        });
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
