export interface IPongEvent {
    index: number;

    remoteReceivedTime: number;

    remoteSentTime: number;

    type: 'pong';
}
