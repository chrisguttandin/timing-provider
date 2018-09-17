import { ConnectableObservable, Observable, Subject, Subscription, merge } from 'rxjs';
import { IDataChannel, IMaskableSubject, TStringifyableJsonValue, wrap } from 'rxjs-broker';
import { accept } from 'rxjs-connector';
import { map, mergeMap, publish, scan, tap, withLatestFrom } from 'rxjs/operators';
import { ITimingProvider, ITimingStateVector, ITimingStateVectorUpdate, TConnectionState } from 'timing-object';
import { EventTarget } from '../event-target';
import { ITimingProviderConstructor } from '../interfaces';

const SUENC_URL = 'https://suenc.io/';

export const createTimingProviderConstructor = (
    estimatedOffset: (openedDataChannelSubjects: Observable<IMaskableSubject<TStringifyableJsonValue>>) => Observable<number>,
    fetch: Window['fetch'],
    performance: Window['performance'],
    setTimeout: Window['setTimeout']
): ITimingProviderConstructor => {

    return class TimingProvider extends EventTarget implements ITimingProvider {

        private _endPosition: number;

        private _error: null | Error;

        private _onadjust: null | EventListener;

        private _onchange: null | EventListener;

        private _onreadystatechange: null | EventListener;

        private _providerId: string;

        private _readyState: TConnectionState;

        private _remoteUpdatesSubscription: null | Subscription;

        private _skew: number;

        private _startPosition: number;

        private _updateRequests: Subject<ITimingStateVectorUpdate>;

        private _vector: ITimingStateVector;

        constructor (providerId: string) {
            super();

            this._endPosition = Number.POSITIVE_INFINITY;
            this._error = null;
            this._onadjust = null;
            this._onchange = null;
            this._onreadystatechange = null;
            this._providerId = providerId;
            this._readyState = 'connecting';
            this._remoteUpdatesSubscription = null;
            this._skew = 0;
            this._startPosition = Number.NEGATIVE_INFINITY;
            this._updateRequests = new Subject();
            this._vector = { acceleration: 0, position: 0, timestamp: 0, velocity: 0 };
            this._createClient();
        }

        get endPosition () {
            return this._endPosition;
        }

        get error () {
            return this._error;
        }

        get onadjust () {
            return this._onadjust;
        }

        get onchange () {
            return this._onchange;
        }

        get onreadystatechange () {
            return this._onreadystatechange;
        }

        get readyState () {
            return this._readyState;
        }

        get skew () {
            return this._skew;
        }

        get startPosition () {
            return this._startPosition;
        }

        get vector () {
            return this._vector;
        }

        public destroy () {
            if (this._remoteUpdatesSubscription === null) {
                throw new Error('The timingProvider is already destroyed.');
            }

            this._readyState = 'closed';
            this._remoteUpdatesSubscription.unsubscribe();
            this._updateRequests.complete();

            setTimeout(() => this.dispatchEvent(new Event('readystatechange')));
        }

        public update (newVector: ITimingStateVectorUpdate) {
            if (this._remoteUpdatesSubscription === null) {
                return Promise.reject(new Error("The timingProvider is destroyed and can't be updated."));
            }

            this._updateRequests.next(newVector);

            return Promise.resolve();
        }

        private async _createClient () {
            const response = await fetch(`${ SUENC_URL }providers/${ this._providerId }/clients`, { method: 'POST' });
            // @todo Use the clientId to delete the client again upon completion.
            const { /* id: clientId, */ socket: { url: clientSocketUrl } } = await response.json();

            // @todo Only set the the readyState to 'open' when there is no other client.
            this._readyState = 'open';

            setTimeout(() => this.dispatchEvent(new Event('readystatechange')));

            const closedDataChannels = new Subject<IDataChannel>();
            const openedDataChannels = <ConnectableObservable<IDataChannel>> accept(clientSocketUrl)
                .pipe(
                    publish<IDataChannel>()
                );
            const openedDataChannelSubjects = openedDataChannels
                .pipe(
                    tap((dataChannel) => {
                        // @todo Ideally use something like the finally operator.

                        const emitClosedDataChannel = () => {
                            dataChannel.removeEventListener('close', emitClosedDataChannel);
                            closedDataChannels.next(dataChannel);
                        };

                        dataChannel.addEventListener('close', emitClosedDataChannel);
                    }),
                    map((dataChannel) => wrap(dataChannel))
                );
            const currentlyOpenDataChannels = merge(closedDataChannels, openedDataChannels)
                .pipe(
                    scan<IDataChannel>((dataChannels, dataChannel) => {
                        const { readyState } = dataChannel;

                        // DataChannels with a readyState of 'open' get appended to the array of DataChannels.
                        if (readyState === 'open') {
                            const index = dataChannels.findIndex(({ label }) => label === dataChannel.label);

                            // In case there was already another channel with the same label, close it and replace it with the new one.
                            if (index > -1) {
                                dataChannels[index].close();

                                return [ ...dataChannels.slice(0, index), ...dataChannels.slice(index + 1), dataChannel ];
                            }

                            return [ ...dataChannels, dataChannel ];
                        }

                        // DataChannels with a readyState of 'closed' get removed from the array of DataChannels.
                        if (readyState === 'closed') {
                            const index = dataChannels.indexOf(dataChannel);

                            // In case the channel was replaced before it can't be detected by it's object identity anymore.
                            if (index === -1) {
                                return dataChannels;
                            }

                            return [ ...dataChannels.slice(0, index), ...dataChannels.slice(index + 1) ];
                        }

                        throw new Error(`The DataChannel has an unexpected readyState "${ readyState }".`);
                    }, [ ])
                );

            this._updateRequests
                .pipe(
                    withLatestFrom(currentlyOpenDataChannels)
                )
                .subscribe(([ vector, dataChannels ]) => {
                    const timeStamp = performance.now();

                    dataChannels.forEach((dataChannel) => {
                        dataChannel.send(JSON.stringify({ type: 'update', message: { timeStamp, vector } }));
                    });

                    this._vector = <ITimingStateVector> (<any> vector);
                    this.dispatchEvent(new CustomEvent('update', { detail: vector }));
                });

            const offsets = estimatedOffset(openedDataChannelSubjects);

            this._remoteUpdatesSubscription = openedDataChannelSubjects
                .pipe(
                    mergeMap((dataChannelSubject) => dataChannelSubject.mask({ type: 'update' })),
                    withLatestFrom(offsets)
                )
                // @todo Replace any with the actual type.
                .subscribe(([ { timeStamp: remoteTimeStamp, vector: { acceleration, position, velocity } }, offset ]: [ any, number ]) => {
                    // @todo Consider the acceleration as well.
                    const now = performance.now();
                    const desiredTimeStamp = remoteTimeStamp - offset;

                    const normalizedPosition = position + (((now - desiredTimeStamp) * velocity) / 1000);
                    // @todo Remove the type casting.
                    const vector = <ITimingStateVector> { acceleration, position: normalizedPosition, velocity };
                    this._vector = vector;

                    this.dispatchEvent(new CustomEvent('update', { detail: vector }));
                });

            openedDataChannels.connect();
        }

    };

};
