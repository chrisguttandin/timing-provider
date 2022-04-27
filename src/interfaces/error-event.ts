export interface IErrorEvent {
    client: {
        id: string;
    };

    type: 'error';

    version: number;
}
