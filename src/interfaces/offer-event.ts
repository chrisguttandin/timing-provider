export interface IOfferEvent {
    client: {
        id: string;
    };

    message: {
        message: {
            offer: RTCSessionDescriptionInit;
        };

        type: 'offer';
    };

    type: undefined;
}
