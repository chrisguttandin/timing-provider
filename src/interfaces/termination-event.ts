export interface ITerminationEvent {
    client: {
        id: string;
    };

    message: {
        type: 'termination';
    };

    token: string;

    type: undefined;
}
