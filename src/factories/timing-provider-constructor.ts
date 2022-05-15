import {
    EMPTY,
    Subject,
    Subscription,
    catchError,
    combineLatest,
    concat,
    concatMap,
    connect,
    defer,
    distinctUntilChanged,
    endWith,
    expand,
    filter,
    finalize,
    first,
    from,
    ignoreElements,
    iif,
    map,
    merge,
    mergeMap,
    of,
    scan,
    startWith,
    tap,
    throwError,
    timer,
    withLatestFrom
} from 'rxjs';
import { IRemoteSubject, wrap } from 'rxjs-broker';
import { equals } from 'rxjs-etc/operators';
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
import { convertToArray } from '../operators/convert-to-array';
import { demultiplexMessages } from '../operators/demultiplex-messages';
import { enforceOrder } from '../operators/enforce-order';
import { filterUniqueValues } from '../operators/filter-unique-values';
import { maintainArray } from '../operators/maintain-array';
import { negotiateDataChannels } from '../operators/negotiate-data-channels';
import { retryBackoff } from '../operators/retry-backoff';
import {
    TDataChannelEvent,
    TExtendedTimingStateVector,
    TTimingProviderConstructor,
    TTimingProviderConstructorFactory,
    TUpdateEvent,
    TWebSocketEvent
} from '../types';

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

        private _hops: number[];

        private _onadjust: null | [TEventHandler<this>, TEventHandler<this>];

        private _onchange: null | [TEventHandler<this>, TEventHandler<this>];

        private _onreadystatechange: null | [TEventHandler<this>, TEventHandler<this>];

        private _origin: number;

        private _providerIdOrUrl: string;

        private _readyState: TConnectionState;

        private _skew: number;

        private _startPosition: number;

        private _subscription: null | Subscription;

        private _updateRequestsSubject: Subject<readonly [null | TExtendedTimingStateVector, null | IRemoteSubject<TDataChannelEvent>]>;

        private _vector: ITimingStateVector;

        private _version: number;

        constructor(providerIdOrUrl: string) {
            super();

            const timestamp = performance.now() / 1000;

            this._endPosition = Number.POSITIVE_INFINITY;
            this._error = null;
            this._hops = [];
            this._onadjust = null;
            this._onchange = null;
            this._onreadystatechange = null;
            this._origin = Number.MAX_SAFE_INTEGER;
            this._providerIdOrUrl = providerIdOrUrl;
            this._readyState = 'connecting';
            this._skew = 0;
            this._startPosition = Number.NEGATIVE_INFINITY;
            this._subscription = null;
            this._updateRequestsSubject = new Subject();
            this._vector = { acceleration: 0, position: 0, timestamp, velocity: 0 };
            this._version = 0;

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

            this._updateRequestsSubject.next([
                {
                    ...translateTimingStateVector(this._vector, performance.now() / 1000 - this._vector.timestamp),
                    ...filterTimingStateVectorUpdate(newVector),
                    hops: [],
                    version: this._version + 1
                },
                null
            ]);

            return Promise.resolve();
        }

        private _createClient(): void {
            const url = PROVIDER_ID_REGEX.test(this._providerIdOrUrl)
                ? `${SUENC_URL}?providerId=${this._providerIdOrUrl}`
                : this._providerIdOrUrl;

            this._subscription = concat(
                from(online()).pipe(equals(true), first(), ignoreElements()),
                defer(() => {
                    const webSocket = new WebSocket(url);

                    return merge(
                        on(webSocket, 'message'),
                        merge(on(webSocket, 'close'), on(webSocket, 'error')).pipe(
                            mergeMap(({ type }) =>
                                // tslint:disable-next-line:rxjs-throw-error
                                throwError(() => new Error(`WebSocket fired unexpected event of type "${type}".`))
                            )
                        )
                    ).pipe(
                        finalize(() => webSocket.close()),
                        map((event) => <TWebSocketEvent>JSON.parse(event.data)),
                        enforceOrder((event): event is IInitEvent => event.type === 'init'),
                        concatMap((event) => {
                            if (event.type === 'init') {
                                const { events, origin } = event;

                                this._origin = origin;

                                if (events.length === 0 && this._readyState === 'connecting') {
                                    this._readyState = 'open';
                                    this.dispatchEvent(new Event('readystatechange'));
                                }

                                return from(events);
                            }

                            return of(event);
                        }),
                        demultiplexMessages(timer(10_000)),
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
                    convertToArray(),
                    tap((tuples) => {
                        if (tuples.length === 0 || tuples.some(([dataChannelSubject]) => dataChannelSubject !== null)) {
                            if (this._readyState === 'connecting') {
                                this._readyState = 'open';
                                this.dispatchEvent(new Event('readystatechange'));
                            }
                        }
                    }),
                    filterUniqueValues(),
                    map(
                        ([dataChannel, isActive]) =>
                            [
                                wrap<TDataChannelEvent>(dataChannel, {
                                    deserializer: (event) => ({ ...JSON.parse(event.data), timestamp: event.timeStamp })
                                }),
                                isActive
                            ] as const
                    ),
                    connect((dataChannelSubjects) => {
                        const currentlyActiveDataChannelSubjects = dataChannelSubjects.pipe(
                            map(([dataChannelSubject]) => <[IRemoteSubject<TDataChannelEvent>, boolean]>[dataChannelSubject, true]),
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
                            dataChannelSubjects.pipe(
                                tap(([dataChannelSubject, isActive]) => {
                                    if (isActive) {
                                        this._sendUpdate(dataChannelSubject);
                                    }
                                }),
                                mergeMap(([dataChannelSubject]) =>
                                    combineLatest([
                                        dataChannelSubject.pipe(
                                            filter((event): event is TUpdateEvent => event.type === 'update'),
                                            map(({ message }) => message),
                                            map((extendedVector) => {
                                                if (this._version > extendedVector.version) {
                                                    this._sendUpdate(dataChannelSubject);

                                                    return null;
                                                }

                                                if (this._version === extendedVector.version) {
                                                    const origin = this._hops.length === 0 ? this._origin : this._hops[0];

                                                    if (origin < extendedVector.hops[0]) {
                                                        this._sendUpdate(dataChannelSubject);

                                                        return null;
                                                    }

                                                    if (
                                                        origin === extendedVector.hops[0] &&
                                                        this._hops.length + 1 < extendedVector.hops.length
                                                    ) {
                                                        this._sendUpdate(dataChannelSubject);

                                                        return null;
                                                    }
                                                }

                                                return extendedVector;
                                            }),
                                            startWith(null)
                                        ),
                                        estimateOffset(dataChannelSubject)
                                    ]).pipe(
                                        catchError(() => EMPTY),
                                        filter((value): value is [TUpdateEvent['message'], number] => value[0] !== null),
                                        distinctUntilChanged(
                                            ([vectorA, offsetA], [vectorB, offsetB]) => vectorA === vectorB && offsetA === offsetB
                                        ),
                                        map(
                                            ([vector, offset]) =>
                                                [{ ...vector, timestamp: vector.timestamp - offset }, dataChannelSubject] as const
                                        ),
                                        endWith([null, dataChannelSubject] as const)
                                    )
                                )
                            ),
                            this._updateRequestsSubject
                        ).pipe(
                            scan<
                                readonly [null | TExtendedTimingStateVector, null | IRemoteSubject<TDataChannelEvent>],
                                [
                                    null | TExtendedTimingStateVector,
                                    [null | IRemoteSubject<TDataChannelEvent>, TExtendedTimingStateVector][]
                                ],
                                undefined
                            >(
                                (
                                    [, dataChannelSubjectsAndExtendedVectors] = [null, [[null, this._createExtendedVector(this._hops)]]],
                                    [extendedVector, dataChannelSubject]
                                ) => {
                                    const index = dataChannelSubjectsAndExtendedVectors.findIndex(
                                        (dataChannelSubjectAndExtendedVector) =>
                                            dataChannelSubjectAndExtendedVector[0] === dataChannelSubject
                                    );

                                    if (extendedVector !== null) {
                                        if (this._version < extendedVector.version) {
                                            dataChannelSubjectsAndExtendedVectors.length = 0;
                                            dataChannelSubjectsAndExtendedVectors.push([dataChannelSubject, extendedVector]);

                                            return [extendedVector, dataChannelSubjectsAndExtendedVectors];
                                        }

                                        if (this._version === extendedVector.version && !extendedVector.hops.includes(this._origin)) {
                                            if (index > -1) {
                                                dataChannelSubjectsAndExtendedVectors[index] = [dataChannelSubject, extendedVector];
                                            } else {
                                                dataChannelSubjectsAndExtendedVectors.push([dataChannelSubject, extendedVector]);
                                            }

                                            dataChannelSubjectsAndExtendedVectors.sort(
                                                (
                                                    [
                                                        ,
                                                        {
                                                            hops: [originA = this._origin, ...hopsA]
                                                        }
                                                    ],
                                                    [
                                                        ,
                                                        {
                                                            hops: [originB = this._origin, ...hopsB]
                                                        }
                                                    ]
                                                ) => {
                                                    return originA === originB ? hopsA.length - hopsB.length : originA - originB;
                                                }
                                            );

                                            return [extendedVector, dataChannelSubjectsAndExtendedVectors];
                                        }
                                    }

                                    if (index > -1) {
                                        if (dataChannelSubjectsAndExtendedVectors.length === 1) {
                                            dataChannelSubjectsAndExtendedVectors.length = 0;
                                            dataChannelSubjectsAndExtendedVectors.push([null, this._createExtendedVector([])]);
                                        } else {
                                            dataChannelSubjectsAndExtendedVectors.splice(index, 1);
                                        }
                                    }

                                    return [extendedVector, dataChannelSubjectsAndExtendedVectors];
                                },
                                undefined
                            ),
                            map(
                                ([latestExtendedVector, [dataChannelSubjectAndExtendedVector]]) =>
                                    [latestExtendedVector, dataChannelSubjectAndExtendedVector] as const
                            ),
                            distinctUntilChanged(([, [, extendedVectorA]], [, [, extendedVectorB]]) => extendedVectorA === extendedVectorB),
                            withLatestFrom(currentlyActiveDataChannelSubjects)
                        );
                    })
                )
                .subscribe(([[latestExtendedVector, [dataChannelSubject, extendedVector]], activeDataChannelSubjects]) => {
                    const externalVector = { ...extendedVector, hops: [...extendedVector.hops, this._origin] };

                    activeDataChannelSubjects.forEach((activeUpdateSubject) => {
                        if (extendedVector === latestExtendedVector && dataChannelSubject !== activeUpdateSubject) {
                            activeUpdateSubject.send({ message: externalVector, type: 'update' });
                        }
                    });

                    this._setInternalVector(extendedVector);
                });
        }

        private _createExtendedVector(hops: number[]): TExtendedTimingStateVector {
            return { ...this._vector, hops, version: this._version };
        }

        private _sendUpdate(dataChannelSubject: IRemoteSubject<TDataChannelEvent>): void {
            dataChannelSubject.send({
                message: this._createExtendedVector([...this._hops, this._origin]),
                type: 'update'
            });
        }

        private _setInternalVector({ hops, version, ...vector }: TExtendedTimingStateVector): void {
            this._hops = hops;
            this._vector = vector;
            this._version = version;

            this.dispatchEvent(new CustomEvent('change', { detail: vector }));
        }
    };
};
