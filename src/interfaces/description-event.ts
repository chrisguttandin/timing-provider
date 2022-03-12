export interface IDescriptionEvent {
    client: {
        id: string;
    };

    message: {
        message: {
            description: RTCSessionDescriptionInit;
        };

        type: 'description';
    };

    token: string;

    type: undefined;
}
