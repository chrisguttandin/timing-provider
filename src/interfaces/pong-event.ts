export interface IPongEvent {
    index: number;

    message: [number, number];

    type: 'pong';
}
