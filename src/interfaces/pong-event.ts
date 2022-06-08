export interface IPongEvent {
    message: [number, number];

    timestamp?: number;

    type: 'pong';
}
