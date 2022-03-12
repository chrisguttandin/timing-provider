export interface ISummaryEvent {
    client: {
        id: string;
    };

    message: {
        message: {
            numberOfGatheredCandidates: number;
        };

        type: 'summary';
    };

    token: string;

    type: undefined;
}
