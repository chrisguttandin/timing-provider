export interface ITerminationEvent {
    client: {
        id: string;
    };

    type: 'termination';
}
