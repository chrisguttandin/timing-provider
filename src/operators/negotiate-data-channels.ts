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

                let clientId: null | string = null;
                let numberOfAppliedCandidates = 0;
                let numberOfExpectedCandidates = Infinity;
                let numberOfGatheredCandidates = 0;

                peerConnection.addEventListener('icecandidate', ({ candidate }) => {
                    if (candidate === null) {
                        send({
                            client: { id: clientId! }, // tslint:disable-line:no-non-null-assertion
                            numberOfGatheredCandidates,
                            type: 'summary'
                        });
                    } else {
                        send({
                            candidate,
                            client: { id: clientId! }, // tslint:disable-line:no-non-null-assertion
                            type: 'candidate'
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
                    if (event.type === 'answer') {
                        peerConnection.setRemoteDescription(event.answer).then(async () => {
                            await Promise.all(receivedCandidates.map((candidate) => peerConnection.addIceCandidate(candidate)));
                            await addFinalCandidate(receivedCandidates.length);
                        });
                    } else if (event.type === 'candidate') {
                        if (peerConnection.remoteDescription === null) {
                            receivedCandidates.push(event.candidate);
                        } else {
                            peerConnection.addIceCandidate(event.candidate).then(() => addFinalCandidate(1));
                        }
                    } else if (event.type === 'offer') {
                        clientId = event.client.id;

                        const unsubscribe = on(
                            peerConnection,
                            'datachannel'
                        )(({ channel }) => {
                            unsubscribe();
                            emitChannel(channel);
                        });

                        peerConnection.setRemoteDescription(event.offer).then(async () => {
                            await Promise.all(receivedCandidates.map((candidate) => peerConnection.addIceCandidate(candidate)));
                            await addFinalCandidate(receivedCandidates.length);

                            const answer = await peerConnection.createAnswer();

                            await peerConnection.setLocalDescription(answer);

                            send({
                                answer,
                                client: event.client,
                                type: 'answer'
                            });
                        });
                    } else if (event.type === 'request') {
                        if (clientId !== null) {
                            return;
                        }

                        clientId = event.client.id;

                        const dataChannel = peerConnection.createDataChannel(event.label, { ordered: true });

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
                                client: event.client,
                                offer,
                                type: 'offer'
                            });
                        });
                    } else if (event.type === 'summary') {
                        numberOfExpectedCandidates = event.numberOfGatheredCandidates;

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
