export interface IDescriptionEvent extends RTCSessionDescriptionInit {
    client: {
        id: string;
    };

    version: number;
}
