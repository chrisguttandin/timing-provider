export interface IAnswerEvent {
    client: {
        id: string;
    };

    message: {
        message: {
            answer: RTCSessionDescriptionInit;
        };

        type: 'answer';
    };

    type: undefined;
}
