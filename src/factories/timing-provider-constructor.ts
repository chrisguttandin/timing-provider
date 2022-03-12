import { EMPTY, Subject, Subscription, combineLatest, concat, defer, from, iif, merge, timer } from 'rxjs';
import { IRemoteSubject, wrap } from 'rxjs-broker';
import { equals } from 'rxjs-etc/operators';
import {
    catchError,
    connect,
    distinctUntilChanged,
    endWith,
    expand,
    filter,
    first,
    ignoreElements,
    map,
    mergeMap,
    startWith,
    tap,
    withLatestFrom
} from 'rxjs/operators';
import { on, online } from 'subscribable-things';
import {
    ITimingProvider,
    ITimingProviderEventMap,
    ITimingStateVector,
    TConnectionState,
    TEventHandler,
    TTimingStateVectorUpdate,
    filterTimingStateVectorUpdate,
    translateTimingStateVector
} from 'timing-object';
import { IInitEvent } from '../interfaces';
import { consumeInitEvent } from '../operators/consume-init-event';
import { demultiplexMessages } from '../operators/demultiplex-messages';
import { enforceOrder } from '../operators/enforce-order';
import { maintainArray } from '../operators/maintain-array';
import { negotiateDataChannels } from '../operators/negotiate-data-channels';
import { retryBackoff } from '../operators/retry-backoff';
import { TDataChannelEvent, TTimingProviderConstructor, TTimingProviderConstructorFactory, TUpdateEvent, TWebSocketEvent } from '../types';

const SUENC_URL = 'wss://matchmaker.suenc.io';
const PROVIDER_ID_REGEX = /^[\dA-Za-z]{20}$/;

export const createTimingProviderConstructor: TTimingProviderConstructorFactory = (
    estimateOffset,
    eventTargetConstructor,
    performance,
    setTimeout
): TTimingProviderConstructor => {
    return class TimingProvider extends eventTargetConstructor<ITimingProviderEventMap> implements ITimingProvider {
        private _endPosition: number;

        private _error: null | Error;

        private _onadjust: null | [TEventHandler<this>, TEventHandler<this>];

        private _onchange: null | [TEventHandler<this>, TEventHandler<this>];

        private _onreadystatechange: null | [TEventHandler<this>, TEventHandler<this>];

        private _providerIdOrUrl: string;

        private _readyState: TConnectionState;

        private _skew: number;

        private _startPosition: number;

        private _subscription: null | Subscription;

        private _timeOrigin: number;

        private _updateRequestsSubject: Subject<ITimingStateVector>;

        private _vector: ITimingStateVector;

        constructor(providerIdOrUrl: string) {
            super();

            const timestamp = performance.now() / 1000;

            this._endPosition = Number.POSITIVE_INFINITY;
            this._error = null;
            this._onadjust = null;
            this._onchange = null;
            this._onreadystatechange = null;
            this._providerIdOrUrl = providerIdOrUrl;
            this._readyState = 'connecting';
            this._skew = 0;
            this._startPosition = Number.NEGATIVE_INFINITY;
            this._subscription = null;
            this._timeOrigin = performance.timeOrigin / 1000 + timestamp;
            this._updateRequestsSubject = new Subject();
            this._vector = { acceleration: 0, position: 0, timestamp, velocity: 0 };

            this._createClient();
        }

        get endPosition(): number {
            return this._endPosition;
        }

        get error(): null | Error {
            return this._error;
        }

        get onadjust(): null | TEventHandler<this> {
            return this._onadjust === null ? this._onadjust : this._onadjust[0];
        }

        set onadjust(value) {
            if (this._onadjust !== null) {
                this.removeEventListener('adjust', this._onadjust[1]);
            }

            if (typeof value === 'function') {
                const boundListener = value.bind(this);

                this.addEventListener('adjust', boundListener);

                this._onadjust = [value, boundListener];
            } else {
                this._onadjust = null;
            }
        }

        get onchange(): null | TEventHandler<this> {
            return this._onchange === null ? this._onchange : this._onchange[0];
        }

        set onchange(value) {
            if (this._onchange !== null) {
                this.removeEventListener('change', this._onchange[1]);
            }

            if (typeof value === 'function') {
                const boundListener = value.bind(this);

                this.addEventListener('change', boundListener);

                this._onchange = [value, boundListener];
            } else {
                this._onchange = null;
            }
        }

        get onreadystatechange(): null | TEventHandler<this> {
            return this._onreadystatechange === null ? this._onreadystatechange : this._onreadystatechange[0];
        }

        set onreadystatechange(value) {
            if (this._onreadystatechange !== null) {
                this.removeEventListener('readystatechange', this._onreadystatechange[1]);
            }

            if (typeof value === 'function') {
                const boundListener = value.bind(this);

                this.addEventListener('readystatechange', boundListener);

                this._onreadystatechange = [value, boundListener];
            } else {
                this._onreadystatechange = null;
            }
        }

        get readyState(): TConnectionState {
            return this._readyState;
        }

        get skew(): number {
            return this._skew;
        }

        get startPosition(): number {
            return this._startPosition;
        }

        get vector(): ITimingStateVector {
            return this._vector;
        }

        public destroy(): void {
            if (this._subscription === null) {
                throw new Error('The timingProvider is already destroyed.');
            }

            this._readyState = 'closed';
            this._subscription.unsubscribe();
            this._subscription = null;
            this._updateRequestsSubject.complete();

            setTimeout(() => this.dispatchEvent(new Event('readystatechange')));
        }

        public update(newVector: TTimingStateVectorUpdate): Promise<void> {
            if (this._subscription === null) {
                return Promise.reject(new Error("The timingProvider is destroyed and can't be updated."));
            }

            this._updateRequestsSubject.next({
                ...translateTimingStateVector(this._vector, performance.now() / 1000 - this._vector.timestamp),
                ...filterTimingStateVectorUpdate(newVector)
            });

            return Promise.resolve();
        }

        private _createClient(): void {
            const url = PROVIDER_ID_REGEX.test(this._providerIdOrUrl)
                ? `${SUENC_URL}?providerId=${this._providerIdOrUrl}`
                : this._providerIdOrUrl;
            const subjectConfig = {
                openObserver: {
                    next: () => {
                        this._readyState = 'open';
                        this.dispatchEvent(new Event('readystatechange'));
                    }
                }
            };
            this._subscription = concat(
                from(online()).pipe(equals(true), first(), ignoreElements()),
                defer(() => {
                    const webSocket = new WebSocket(url);

                    webSocket.onopen = () => subjectConfig?.openObserver?.next();

                    return from(on(webSocket, 'message')).pipe(
                        map((event) => <TWebSocketEvent>JSON.parse(event.data)),
                        enforceOrder((event): event is IInitEvent => event.type === 'init'),
                        consumeInitEvent(
                            (event): event is IInitEvent => event.type === 'init',
                            () => {} // tslint:disable-line:no-empty
                        ),
                        demultiplexMessages(() => timer(10_000)),
                        negotiateDataChannels(
                            () =>
                                new RTCPeerConnection({
                                    iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
                                }),
                            webSocket
                        )
                    );
                })
            )
                .pipe(
                    retryBackoff(),
                    catchError((err) => {
                        this._error = err;
                        this._readyState = 'closed';
                        this.dispatchEvent(new ErrorEvent('error', { error: err }));

                        return EMPTY;
                    }),
                    map((dataChannel) =>
                        wrap<TDataChannelEvent>(dataChannel, {
                            deserializer: (event) => ({ ...JSON.parse(event.data), timestamp: event.timeStamp })
                        })
                    ),
                    connect((dataChannelSubjects) => {
                        const currentlyActiveDataChannelSubjects = dataChannelSubjects.pipe(
                            map((dataChannelSubject) => <[IRemoteSubject<TDataChannelEvent>, boolean]>[dataChannelSubject, true]),
                            expand(([dataChannelSubject, isExpandable]) =>
                                iif(
                                    () => isExpandable,
                                    dataChannelSubject.pipe(
                                        catchError(() => EMPTY),
                                        ignoreElements(),
                                        endWith<[IRemoteSubject<TDataChannelEvent>, boolean]>([dataChannelSubject, false])
                                    ),
                                    EMPTY
                                )
                            ),
                            maintainArray(),
                            startWith([])
                        );

                        return merge(
                            this._updateRequestsSubject.pipe(
                                withLatestFrom(currentlyActiveDataChannelSubjects),
                                map(([vector, activeDataChannelSubjects]) => {
                                    activeDataChannelSubjects.forEach((activeUpdateSubject) =>
                                        activeUpdateSubject.send({ message: { ...vector, timeOrigin: this._timeOrigin }, type: 'update' })
                                    );

                                    this._setInternalVector(vector);
                                })
                            ),
                            dataChannelSubjects.pipe(
                                mergeMap((dataChannelSubject, index) => {
                                    if (index === 0) {
                                        dataChannelSubject.send({ type: 'request' });
                                    }

                                    return dataChannelSubject.pipe(
                                        filter(({ type }) => type === 'request'),
                                        catchError(() => EMPTY),
                                        tap(() => {
                                            dataChannelSubject.send({
                                                message: { ...this._vector, timeOrigin: this._timeOrigin },
                                                type: 'update'
                                            });
                                        })
                                    );
                                })
                            ),
                            dataChannelSubjects.pipe(
                                mergeMap((dataChannelSubject) =>
                                    combineLatest([
                                        dataChannelSubject.pipe(
                                            filter((event): event is TUpdateEvent => event.type === 'update'),
                                            map(({ message }) => message)
                                        ),
                                        estimateOffset(dataChannelSubject)
                                    ]).pipe(
                                        catchError(() => EMPTY),
                                        distinctUntilChanged(([vectorA], [vectorB]) => vectorA === vectorB)
                                    )
                                ),
                                map(([{ acceleration, position, timeOrigin, timestamp: remoteTimestamp, velocity }, offset]) => {
                                    const timestamp = remoteTimestamp - offset;

                                    if (
                                        this._timeOrigin < timeOrigin ||
                                        (this._timeOrigin === timeOrigin && this._vector.timestamp > timestamp)
                                    ) {
                                        const vector = translateTimingStateVector(
                                            this._vector,
                                            performance.now() / 1000 - this._vector.timestamp
                                        );

                                        this._updateRequestsSubject.next(vector);
                                    } else {
                                        if (this._timeOrigin > timeOrigin) {
                                            this._timeOrigin = timeOrigin;
                                        }

                                        this._setInternalVector({ acceleration, position, timestamp, velocity });
                                    }
                                })
                            )
                        );
                    })
                )
                .subscribe();
        }

        private _setInternalVector(vector: ITimingStateVector): void {
            this._vector = vector;

            this.dispatchEvent(new CustomEvent('change', { detail: vector }));
        }
    };
};
