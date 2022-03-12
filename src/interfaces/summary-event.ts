export interface ISummaryEvent {
    client: {
        id: string;
    };

    numberOfGatheredCandidates: number;

    type: 'summary';
}
