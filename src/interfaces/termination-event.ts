export interface ITerminationEvent {
    client: {
        id: string;
    };

    message: {
        type: 'termination';
    };

    type: undefined;
}
