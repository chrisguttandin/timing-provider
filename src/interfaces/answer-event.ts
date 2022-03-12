export interface IAnswerEvent {
    answer: RTCSessionDescriptionInit;

    client: {
        id: string;
    };

    type: 'answer';
}
