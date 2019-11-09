import { ConnectableObservable, Subject, Subscription, merge } from 'rxjs';
import { mask, wrap } from 'rxjs-broker';
import { accept } from 'rxjs-connector';
import { filter, map, mergeMap, publish, scan, tap, withLatestFrom } from 'rxjs/operators';
import {
    ITimingProvider,
    ITimingStateVector,
    TConnectionState,
    TTimingStateVectorUpdate,
    filterTimingStateVectorUpdate
} from 'timing-object';
import { TDataChannelEvent, TTimingProviderConstructor, TTimingProviderConstructorFactory, TUpdateEvent } from '../types';

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

        private _remoteUpdatesSubscription: null | Subscription;

        private _skew: number;

        private _startPosition: number;

        private _updateRequestsSubject: Subject<TTimingStateVectorUpdate>;

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
            this._updateRequestsSubject = new Subject();
            this._vector = { acceleration: 0, position: 0, timestamp: 0, velocity: 0 };
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
            if (this._remoteUpdatesSubscription === null) {
                throw new Error('The timingProvider is already destroyed.');
            }

            this._readyState = 'closed';
            this._remoteUpdatesSubscription.unsubscribe();
            this._updateRequestsSubject.complete();

            setTimeout(() => this.dispatchEvent(new Event('readystatechange')));
        }

        public update (newVector: TTimingStateVectorUpdate): Promise<void> { // tslint:disable-line:invalid-void
            if (this._remoteUpdatesSubscription === null) {
                return Promise.reject(new Error("The timingProvider is destroyed and can't be updated."));
            }

            this._updateRequestsSubject.next(newVector);

            return Promise.resolve();
        }

        private async _createClient (): Promise<void> { // tslint:disable-line:invalid-void
            const response = await fetch(`${ SUENC_URL }providers/${ this._providerId }/clients`, { method: 'POST' });
            // @todo Use the clientId to delete the client again upon completion.
            const { /* id: clientId, */ socket: { url: clientSocketUrl } } = await response.json();

            // @todo Only set the the readyState to 'open' when there is no other client.
            this._readyState = 'open';

            setTimeout(() => this.dispatchEvent(new Event('readystatechange')));

            const closedDataChannelsSubject = new Subject<RTCDataChannel>();
            const openedDataChannels = <ConnectableObservable<RTCDataChannel>> accept(clientSocketUrl)
                .pipe(
                    publish<RTCDataChannel>()
                );
            const openedDataChannelSubjects = openedDataChannels
                .pipe(
                    tap((dataChannel) => {
                        // @todo Ideally use something like the finally operator.

                        const emitClosedDataChannel = () => {
                            dataChannel.removeEventListener('close', emitClosedDataChannel);
                            closedDataChannelsSubject.next(dataChannel);
                        };

                        dataChannel.addEventListener('close', emitClosedDataChannel);
                    }),
                    map((dataChannel) => wrap<TDataChannelEvent>(dataChannel))
                );
            const currentlyOpenDataChannels = merge(closedDataChannelsSubject, openedDataChannels)
                .pipe(
                    scan<RTCDataChannel, RTCDataChannel[]>((dataChannels, dataChannel) => {
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

            this._updateRequestsSubject
                .pipe(
                    map((vector) => filterTimingStateVectorUpdate(vector)),
                    filter((vector) => {
                        for (const [ property, value ] of Object.entries(vector)) {
                            if (value !== this._vector[<'acceleration' | 'position' | 'velocity'> property]) {
                                return true;
                            }
                        }

                        return false;
                    }),
                    map((vector) => {
                        const { acceleration, position, velocity } = this._vector;

                        return { acceleration, position, timestamp: performance.now() / 1000, velocity, ...vector };
                    }),
                    withLatestFrom(currentlyOpenDataChannels)
                )
                .subscribe(([ vector, dataChannels ]) => {
                    dataChannels
                        /*
                         * Before firing the close event a DataChannel transitions to the 'closing' state. When that happens calling send()
                         * is not possible anymore and throws an error.
                         */
                        .filter(({ readyState }) => (readyState !== 'closing'))
                        .forEach((dataChannel) => {
                            dataChannel.send(JSON.stringify({ type: 'update', message: vector }));
                        });

                    this._setInternalVector(vector);
                });

            const offset$ = estimateOffset(openedDataChannelSubjects);

            this._remoteUpdatesSubscription = openedDataChannelSubjects
                .pipe(
                    mergeMap((dataChannelSubject) => {
                        return mask<TUpdateEvent['message'], TUpdateEvent, TDataChannelEvent>({ type: 'update' }, dataChannelSubject);
                    }),
                    withLatestFrom(offset$)
                )
                .subscribe(([ { acceleration, position, timestamp: remoteTimestamp, velocity }, offset ]) => {
                    const timestamp = remoteTimestamp - offset;

                    this._setInternalVector({ acceleration, position, timestamp, velocity });
                });

            openedDataChannels.connect();
        }

        private _setInternalVector (vector: ITimingStateVector): void {
            this._vector = vector;

            this.dispatchEvent(new CustomEvent('change', { detail: vector }));
        }

    };

};
