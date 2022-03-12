export interface ICandidateEvent {
    client: {
        id: string;
    };

    message: {
        message: {
            candidate: RTCIceCandidateInit;
        };

        type: 'candidate';
    };

    token: string;

    type: undefined;
}
