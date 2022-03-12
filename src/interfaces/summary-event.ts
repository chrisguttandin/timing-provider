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

    type: undefined;
}
