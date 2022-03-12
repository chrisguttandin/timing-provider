export interface IRequestEvent {
    client: {
        id: string;
    };

    label: string;

    type: 'request';
}
