export interface ICandidateEvent {
    candidate: RTCIceCandidateInit;

    client: {
        id: string;
    };

    type: 'candidate';
}
