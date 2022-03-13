export interface ICandidateEvent extends RTCIceCandidateInit {
    client: {
        id: string;
    };

    type: 'candidate';
}
