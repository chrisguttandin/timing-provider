export interface IOfferEvent {
    client: {
        id: string;
    };

    offer: RTCSessionDescriptionInit;

    type: 'offer';
}
