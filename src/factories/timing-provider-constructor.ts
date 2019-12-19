import { ConnectableObservable, Subject, Subscription, combineLatest } from 'rxjs';
import { IRemoteSubject, mask, wrap } from 'rxjs-broker';
import { accept } from 'rxjs-connector';
import { distinctUntilChanged, expand, last, map, mapTo, mergeMap, publish, scan, startWith, withLatestFrom } from 'rxjs/operators';
import {
    ITimingProvider,
    ITimingStateVector,
    TConnectionState,
    TTimingStateVectorUpdate,
    filterTimingStateVectorUpdate,
    translateTimingStateVector
} from 'timing-object';
import { TDataChannelEvent, TRequestEvent, TTimingProviderConstructor, TTimingProviderConstructorFactory, TUpdateEvent } from '../types';

const SUENC_URL = 'https://suenc.io/';

export const createTimingProviderConstructor: TTimingProviderConstructorFactory = (
    estimateOffset,
    eventTargetConstructor,
    fetch,
    performance,
    setTimeout
): TTimingProviderConstructor => {

    return class TimingProvider extends eventTargetConstructor implements ITimingProvider {

        private _endPosition: number;

        private _error: null | Error;

        private _onadjust: null | EventListener;

        private _onchange: null | EventListener;

        private _onreadystatechange: null | EventListener;

        private _providerId: string;

        private _readyState: TConnectionState;

        private _remoteRequestsSubscription: null | Subscription;

        private _remoteUpdatesSubscription: null | Subscription;

        private _skew: number;

        private _startPosition: number;

        private _timeOrigin: number;

        private _updateRequestsSubject: Subject<ITimingStateVector>;

        private _vector: ITimingStateVector;

        constructor (providerId: string) {
            super();

            const timestamp = performance.now() / 1000;

            this._endPosition = Number.POSITIVE_INFINITY;
            this._error = null;
            this._onadjust = null;
            this._onchange = null;
            this._onreadystatechange = null;
            this._providerId = providerId;
            this._readyState = 'connecting';
            this._remoteRequestsSubscription = null;
            this._remoteUpdatesSubscription = null;
            this._skew = 0;
            this._startPosition = Number.NEGATIVE_INFINITY;
            this._timeOrigin = (performance.timeOrigin / 1000) + timestamp;
            this._updateRequestsSubject = new Subject();
            this._vector = { acceleration: 0, position: 0, timestamp, velocity: 0 };

            this._createClient();
        }

        get endPosition (): number {
            return this._endPosition;
        }

        get error (): null | Error {
            return this._error;
        }

        get onadjust (): null | EventListener {
            return this._onadjust;
        }

        get onchange (): null | EventListener {
            return this._onchange;
        }

        get onreadystatechange (): null | EventListener {
            return this._onreadystatechange;
        }

        get readyState (): TConnectionState {
            return this._readyState;
        }

        get skew (): number {
            return this._skew;
        }

        get startPosition (): number {
            return this._startPosition;
        }

        get vector (): ITimingStateVector {
            return this._vector;
        }

        public destroy (): void {
            if (this._remoteRequestsSubscription === null || this._remoteUpdatesSubscription === null) {
                throw new Error('The timingProvider is already destroyed.');
            }

            this._readyState = 'closed';
            this._remoteRequestsSubscription.unsubscribe();
            this._remoteRequestsSubscription = null;
            this._remoteUpdatesSubscription.unsubscribe();
            this._remoteUpdatesSubscription = null;
            this._updateRequestsSubject.complete();

            setTimeout(() => this.dispatchEvent(new Event('readystatechange')));
        }

        public update (newVector: TTimingStateVectorUpdate): Promise<void> { // tslint:disable-line:invalid-void
            if (this._remoteUpdatesSubscription === null) {
                return Promise.reject(new Error("The timingProvider is destroyed and can't be updated."));
            }

            this._updateRequestsSubject.next({
                ...translateTimingStateVector(this._vector, (performance.now() / 1000) - this._vector.timestamp),
                ...filterTimingStateVectorUpdate(newVector)
            });

            return Promise.resolve();
        }

        private async _createClient (): Promise<void> { // tslint:disable-line:invalid-void
            const response = await fetch(`${ SUENC_URL }providers/${ this._providerId }/clients`, { method: 'POST' });
            // @todo Use the clientId to delete the client again upon completion.
            const { /* id: clientId, */ socket: { url: clientSocketUrl } } = await response.json();

            // @todo Only set the the readyState to 'open' when there is no other client.
            this._readyState = 'open';

            setTimeout(() => this.dispatchEvent(new Event('readystatechange')));

            const dataChannelSubjects = <ConnectableObservable<IRemoteSubject<TDataChannelEvent>>> accept(clientSocketUrl)
                .pipe(
                    map((dataChannel) => wrap<TDataChannelEvent>(dataChannel)),
                    publish()
                );
            const updateSubjects = dataChannelSubjects
                .pipe(
                    map((dataChannelSubject) => {
                        return mask<TUpdateEvent['message'], TUpdateEvent, TDataChannelEvent>({ type: 'update' }, dataChannelSubject);
                    })
                );
            const currentlyActiveUpdateSubjects = <ConnectableObservable<IRemoteSubject<TUpdateEvent['message']>[]>> updateSubjects
                .pipe(
                    expand((updateSubject) => updateSubject
                        .pipe(
                            last(null),
                            mapTo(updateSubject)
                        )
                    ),
                    scan<IRemoteSubject<TUpdateEvent['message']>, IRemoteSubject<TUpdateEvent['message']>[]>((
                        activeUpdateSubjects,
                        activeUpdateSubject
                    ) => {
                        const index = activeUpdateSubjects.indexOf(activeUpdateSubject);

                        if (index > -1) {
                            return [ ...activeUpdateSubjects.slice(0, index), ...activeUpdateSubjects.slice(index + 1) ];
                        }

                        return [ ...activeUpdateSubjects, activeUpdateSubject ];
                    }, [ ]),
                    startWith([ ])
                );

            this._updateRequestsSubject
                .pipe(
                    withLatestFrom(currentlyActiveUpdateSubjects)
                )
                .subscribe(([ vector, activeUpdateSubjects ]) => {
                    activeUpdateSubjects
                        .forEach((activeUpdateSubject) => activeUpdateSubject.send({ ...vector, timeOrigin: this._timeOrigin }));

                    this._setInternalVector(vector);
                });

            this._remoteRequestsSubscription = updateSubjects
                .pipe(
                    withLatestFrom(dataChannelSubjects),
                    mergeMap(([ updateSubject, dataChannelSubject ], index) => {
                        const requestSubject = mask<TRequestEvent['message'], TRequestEvent, TDataChannelEvent>(
                            { type: 'request' },
                            dataChannelSubject
                        );

                        if (index === 0) {
                            requestSubject.send(undefined);
                        }

                        return requestSubject
                            .pipe(
                                mapTo(updateSubject)
                            );
                    })
                )
                .subscribe((updatesSubject) => {
                    updatesSubject.send({ ...this._vector, timeOrigin: this._timeOrigin });
                });

            this._remoteUpdatesSubscription = updateSubjects
                .pipe(
                    withLatestFrom(dataChannelSubjects),
                    mergeMap(([ updateSubject, dataChannelSubject ]) => combineLatest([ updateSubject, estimateOffset(dataChannelSubject) ])
                        .pipe(
                            distinctUntilChanged(([ vectorA ], [ vectorB ]) => (vectorA === vectorB))
                        )))
                .subscribe(([ { acceleration, position, timeOrigin, timestamp: remoteTimestamp, velocity }, offset ]) => {
                    const timestamp = remoteTimestamp - offset;

                    if (this._timeOrigin < timeOrigin || (this._timeOrigin === timeOrigin && this._vector.timestamp > timestamp)) {
                        const vector = translateTimingStateVector(this._vector, (performance.now() / 1000) - this._vector.timestamp);

                        this._updateRequestsSubject.next(vector);
                    } else {
                        if (this._timeOrigin > timeOrigin) {
                            this._timeOrigin = timeOrigin;
                        }

                        this._setInternalVector({ acceleration, position, timestamp, velocity });
                    }
                });

            dataChannelSubjects.connect();
        }

        private _setInternalVector (vector: ITimingStateVector): void {
            this._vector = vector;

            this.dispatchEvent(new CustomEvent('change', { detail: vector }));
        }

    };

};
