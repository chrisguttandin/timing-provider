export interface IRequestEvent {
    client: undefined;

    message: {
        label: string;

        mask: {
            client: {
                id: string;
            };
        };

        type: undefined;
    };

    type: 'request';
}
