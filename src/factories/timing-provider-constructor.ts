import {
    BehaviorSubject,
    EMPTY,
    ReplaySubject,
    Subject,
    Subscription,
    catchError,
    concat,
    concatMap,
    connect,
    defer,
    distinctUntilChanged,
    endWith,
    filter,
    first,
    from,
    groupBy,
    ignoreElements,
    map,
    merge,
    mergeMap,
    of,
    scan,
    take,
    tap,
    timer
} from 'rxjs';
import { equals } from 'rxjs-etc/operators';
import { online } from 'subscribable-things';
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
import { findSendPeerToPeerMessageFunction } from '../functions/find-send-peer-to-peer-message-function';
import { isBooleanTuple } from '../functions/is-boolean-tuple';
import { isFalseTuple } from '../functions/is-false-tuple';
import { isNotBooleanTuple } from '../functions/is-not-boolean-tuple';
import { isPeerToPeerMessageTuple } from '../functions/is-peer-to-peer-message-tuple';
import { isSendPeerToPeerMessageTuple } from '../functions/is-send-peer-to-peer-message-tuple';
import { isTrueTuple } from '../functions/is-true-tuple';
import { IClosureEvent, IInitEvent, IPingEvent, IPongEvent, IUpdateEvent } from '../interfaces';
import { combineAsTuple } from '../operators/combine-as-tuple';
import { computeOffsetAndRoundTripTime } from '../operators/compute-offset-and-round-trip-time';
import { demultiplexMessages } from '../operators/demultiplex-messages';
import { enforceOrder } from '../operators/enforce-order';
import { groupByProperty } from '../operators/group-by-property';
import { matchPongWithPing } from '../operators/match-pong-with-ping';
import { negotiateDataChannels } from '../operators/negotiate-data-channels';
import { retryBackoff } from '../operators/retry-backoff';
import { selectMostLikelyOffset } from '../operators/select-most-likely-offset';
import { sendPeriodicPings } from '../operators/send-periodic-pings';
import { takeUntilFatalValue } from '../operators/take-until-fatal-value';
import {
    TDataChannelTuple,
    TEventTargetConstructor,
    TExtendedTimingStateVector,
    TSendPeerToPeerMessageFunction,
    TTimingProviderConstructor
} from '../types';
import type { createRTCPeerConnectionFactory } from './rtc-peer-connection-factory';
import type { createSignalingFactory } from './signaling-factory';
import type { createSortByHopsAndRoundTripTime } from './sort-by-hops-and-round-trip-time';

const SUENC_URL = 'wss://matchmaker.suenc.io';
const PROVIDER_ID_REGEX = /^[\dA-Za-z]{20}$/;

export const createTimingProviderConstructor = (
    createRTCPeerConnection: ReturnType<typeof createRTCPeerConnectionFactory>,
    createSignaling: ReturnType<typeof createSignalingFactory>,
    eventTargetConstructor: TEventTargetConstructor,
    performance: Window['performance'],
    setTimeout: Window['setTimeout'],
    sortByHopsAndRoundTripTime: ReturnType<typeof createSortByHopsAndRoundTripTime<[unknown, { hops: number[] }, number]>>
): TTimingProviderConstructor => {
    return class TimingProvider extends eventTargetConstructor<ITimingProviderEventMap> implements ITimingProvider {
        private _clientId: string;

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

        // tslint:disable-next-line:rxjs-no-exposed-subjects
        private _updateRequestsSubject: Subject<readonly [TExtendedTimingStateVector, null]>;

        private _vector: ITimingStateVector;

        private _version: number;

        constructor(providerIdOrUrl: string) {
            super();

            const timestamp = performance.now() / 1000;

            this._clientId = '';
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

            this._subscription = merge(
                concat(
                    from(online()).pipe(equals(true), first(), ignoreElements()),
                    defer(() => {
                        const [signalingEvent$, sendSignalingEvent] = createSignaling(url);

                        return signalingEvent$.pipe(
                            takeUntilFatalValue(
                                (event): event is IClosureEvent => event.type === 'closure',
                                () => {
                                    const err = new Error('Your plan has exceeded its quota.');

                                    this._error = err;
                                    this._readyState = 'closed';
                                    this.dispatchEvent(new Event('readystatechange'));
                                }
                            ),
                            enforceOrder((event): event is IInitEvent => event.type === 'init'),
                            concatMap((event) => {
                                if (event.type === 'array') {
                                    return from(event.events);
                                }

                                if (event.type === 'init') {
                                    const {
                                        client: { id: clientId },
                                        events,
                                        origin
                                    } = event;

                                    this._clientId = clientId;
                                    this._origin = origin;

                                    if (events.length === 0 && this._readyState === 'connecting') {
                                        this._readyState = 'open';
                                        this.dispatchEvent(new Event('readystatechange'));
                                    }

                                    return from(events);
                                }

                                return of(event);
                            }),
                            demultiplexMessages(() => this._clientId, timer(10_000)),
                            negotiateDataChannels(createRTCPeerConnection, sendSignalingEvent)
                        );
                    })
                ).pipe(
                    retryBackoff(),
                    catchError((err) => {
                        this._error = err;
                        this._readyState = 'closed';
                        this.dispatchEvent(new Event('readystatechange'));

                        return EMPTY;
                    }),
                    tap((dataChannelTuple) => {
                        if (isSendPeerToPeerMessageTuple(dataChannelTuple) && this._readyState === 'connecting') {
                            this._readyState = 'open';
                            this.dispatchEvent(new Event('readystatechange'));
                        }
                    }),
                    scan<
                        TDataChannelTuple,
                        [TDataChannelTuple, [string, true | TSendPeerToPeerMessageFunction][]],
                        [void, [string, true | TSendPeerToPeerMessageFunction][]]
                    >(
                        ([, dataChannelTuples], dataChannelTuple) => {
                            const index = dataChannelTuples.findIndex(([clientId]) => clientId === dataChannelTuple[0]);

                            if (index === -1) {
                                if (isTrueTuple(dataChannelTuple) || isSendPeerToPeerMessageTuple(dataChannelTuple)) {
                                    dataChannelTuples.push(dataChannelTuple);
                                }
                            } else if (isFalseTuple(dataChannelTuple)) {
                                dataChannelTuples.splice(index, 1);
                            } else if (isTrueTuple(dataChannelTuple) || isSendPeerToPeerMessageTuple(dataChannelTuple)) {
                                dataChannelTuples[index] = dataChannelTuple;
                            }

                            return [dataChannelTuple, dataChannelTuples];
                        },
                        [, []] // tslint:disable-line:no-sparse-arrays
                    ),
                    tap(([, dataChannelTuples]) => {
                        if (dataChannelTuples.length === 0 && this._readyState === 'connecting') {
                            this._readyState = 'open';
                            this.dispatchEvent(new Event('readystatechange'));
                        }
                    }),
                    filter(([dataChannelTuple]) => {
                        if (isSendPeerToPeerMessageTuple(dataChannelTuple)) {
                            if (
                                !dataChannelTuple[1]({ message: this._createExtendedVector([...this._hops, this._origin]), type: 'update' })
                            ) {
                                return false;
                            }
                        }

                        return true;
                    }),
                    connect((dataChannelTuple$) => {
                        const dataChannelTuplesSubject = new ReplaySubject<[string, true | TSendPeerToPeerMessageFunction][]>(1);

                        return dataChannelTuple$.pipe(
                            tap(([, dataChannelTuples]) => dataChannelTuplesSubject.next(dataChannelTuples)),
                            map<
                                [TDataChannelTuple, TDataChannelTuple[]],
                                readonly [
                                    string,
                                    (
                                        | boolean
                                        | (IPingEvent & { reply: TSendPeerToPeerMessageFunction; timestamp: number })
                                        | (IPongEvent & { timestamp: number })
                                        | IUpdateEvent
                                        | TSendPeerToPeerMessageFunction
                                    )
                                ]
                            >(([dataChannelTuple, dataChannelTuples]) => {
                                if (isPeerToPeerMessageTuple(dataChannelTuple)) {
                                    const [clientId, event] = dataChannelTuple;

                                    if (event.type === 'ping') {
                                        return <const>[
                                            clientId,
                                            {
                                                ...event,
                                                reply: findSendPeerToPeerMessageFunction(
                                                    clientId,
                                                    dataChannelTuples.filter(isSendPeerToPeerMessageTuple)
                                                )
                                            }
                                        ];
                                    }
                                }

                                return <
                                    readonly [
                                        string,
                                        boolean | (IPongEvent & { timestamp: number }) | IUpdateEvent | TSendPeerToPeerMessageFunction
                                    ]
                                >dataChannelTuple;
                            }),
                            filter(isNotBooleanTuple),
                            groupBy(([clientId]) => clientId, {
                                duration: (group$) =>
                                    dataChannelTuple$.pipe(
                                        map(([dataChannelTuple]) => dataChannelTuple),
                                        filter(isBooleanTuple),
                                        filter(([clientId]) => clientId === group$.key)
                                    )
                            }),
                            mergeMap((messageOrFunctionTuple$) => {
                                const localSentTimesSubject = new BehaviorSubject<[number, number[]]>([0, []]);

                                return messageOrFunctionTuple$.pipe(
                                    connect((observable$) =>
                                        merge(
                                            observable$.pipe(
                                                filter(isSendPeerToPeerMessageTuple),
                                                sendPeriodicPings(localSentTimesSubject, () => performance.now())
                                            ),
                                            observable$.pipe(
                                                filter(isPeerToPeerMessageTuple),
                                                map(([, event]) => event),
                                                groupByProperty('type'),
                                                mergeMap((group$) => {
                                                    if (group$.key === 'ping') {
                                                        return group$.pipe(
                                                            tap(({ index, timestamp, reply }) =>
                                                                reply({
                                                                    index,
                                                                    remoteReceivedTime: timestamp,
                                                                    remoteSentTime: performance.now(),
                                                                    type: 'pong'
                                                                })
                                                            ),
                                                            ignoreElements()
                                                        );
                                                    }

                                                    if (group$.key === 'pong') {
                                                        return group$.pipe(
                                                            matchPongWithPing(localSentTimesSubject),
                                                            computeOffsetAndRoundTripTime(),
                                                            selectMostLikelyOffset(),
                                                            map((offset) => [1, offset] as const)
                                                        );
                                                    }

                                                    return group$.pipe(
                                                        map(({ message }) => message),
                                                        map((extendedVector) => {
                                                            if (this._version > extendedVector.version) {
                                                                return null;
                                                            }

                                                            if (this._version === extendedVector.version) {
                                                                const origin = this._hops.length === 0 ? this._origin : this._hops[0];

                                                                if (
                                                                    origin < extendedVector.hops[0] ||
                                                                    extendedVector.hops.includes(this._origin)
                                                                ) {
                                                                    return null;
                                                                }
                                                            }

                                                            return extendedVector;
                                                        }),
                                                        map((extendedVector) => [0, extendedVector] as const)
                                                    );
                                                }),
                                                combineAsTuple<null | TExtendedTimingStateVector, [number, number]>([null, [0, 0]]),
                                                distinctUntilChanged(
                                                    ([vectorA, [offsetA, roundTripTimeA]], [vectorB, [offsetB, roundTripTimeB]]) =>
                                                        vectorA === vectorB && offsetA === offsetB && roundTripTimeA === roundTripTimeB
                                                ),
                                                map(
                                                    ([vector, [offset, roundTripTime]]) =>
                                                        <const>[
                                                            messageOrFunctionTuple$.key,
                                                            vector === null
                                                                ? null
                                                                : { ...vector, timestamp: vector.timestamp - offset / 1000 },
                                                            roundTripTime
                                                        ]
                                                ),
                                                endWith(<const>[messageOrFunctionTuple$.key, null, null])
                                            )
                                        )
                                    )
                                );
                            }),
                            scan<
                                readonly [string, null | TExtendedTimingStateVector, number] | readonly [string, null, null],
                                [
                                    readonly [string, null | TExtendedTimingStateVector, number] | readonly [string, null, null],
                                    (readonly [string, null | TExtendedTimingStateVector, number])[]
                                ],
                                [void, (readonly [string, null | TExtendedTimingStateVector, number])[]]
                            >(
                                ([, tuples], tuple) => {
                                    const index = tuples.findIndex(([clientId]) => tuple[0] === clientId);

                                    if (tuple[2] === null) {
                                        if (index > -1) {
                                            tuples.splice(index, 1);
                                        }
                                    } else {
                                        if (index > -1) {
                                            tuples[index] = tuple;
                                        } else {
                                            tuples.push(tuple);
                                            tuples.sort(([clientIdA], [clientIdB]) =>
                                                clientIdA < clientIdB ? -1 : clientIdA > clientIdB ? 1 : 0
                                            );
                                        }
                                    }

                                    return [tuple, tuples];
                                },
                                [, []] // tslint:disable-line:no-sparse-arrays
                            ),
                            mergeMap((tupleAndTuples) =>
                                dataChannelTuplesSubject.pipe(
                                    take(1),
                                    map((dataChannelTuples) => <const>[tupleAndTuples, dataChannelTuples])
                                )
                            ),
                            map(([[tuple], dataChannelTuples]) => <const>[...tuple, dataChannelTuples])
                        );
                    })
                ),
                this._updateRequestsSubject.pipe(map(([vector]) => <const>[null, vector, 0, null]))
            )
                .pipe(
                    scan<
                        | readonly [string, null | TExtendedTimingStateVector, number, TDataChannelTuple[]]
                        | readonly [string, null, null, TDataChannelTuple[]]
                        | readonly [null, TExtendedTimingStateVector, number, null],
                        [[null | string, TExtendedTimingStateVector, number][], TDataChannelTuple[]],
                        undefined
                    >(
                        (
                            [tuples, previousDataChannelTuples] = [[[null, this._createExtendedVector(this._hops), 0]], []],
                            [clientId, extendedVector, roundTripTime, currentDataChannelTuples]
                        ) => {
                            const dataChannelTuples = currentDataChannelTuples ?? previousDataChannelTuples;
                            const index = tuples.findIndex((tuple) => tuple[0] === clientId);

                            if (extendedVector !== null) {
                                if (this._version < extendedVector.version) {
                                    tuples.length = 0;
                                    tuples.push([clientId, extendedVector, roundTripTime]);

                                    return [tuples, dataChannelTuples];
                                }

                                if (this._version === extendedVector.version) {
                                    const origin = this._hops.length === 0 ? this._origin : this._hops[0];

                                    if (origin > extendedVector.hops[0]) {
                                        if (!extendedVector.hops.includes(this._origin)) {
                                            tuples.length = 0;
                                            tuples.push([clientId, extendedVector, roundTripTime]);

                                            return [tuples, dataChannelTuples];
                                        }
                                    }

                                    if (
                                        origin === extendedVector.hops[0] &&
                                        !extendedVector.hops.includes(this._origin) &&
                                        this._hops.length > 0
                                    ) {
                                        if (index > -1) {
                                            tuples[index] = [clientId, extendedVector, roundTripTime];
                                        } else {
                                            tuples.push([clientId, extendedVector, roundTripTime]);
                                        }

                                        sortByHopsAndRoundTripTime(tuples);

                                        return [tuples, dataChannelTuples];
                                    }
                                }
                            }

                            if (index > -1) {
                                if (tuples.length === 1) {
                                    tuples[0] = [
                                        null,
                                        {
                                            ...tuples[0][1],
                                            hops: [tuples[0][1].hops[0], ...tuples[0][1].hops.map(() => this._origin)]
                                        },
                                        0
                                    ];
                                } else {
                                    tuples.splice(index, 1);
                                }
                            }

                            return [tuples, dataChannelTuples];
                        },
                        undefined
                    ),
                    distinctUntilChanged(
                        (extendedVectorA, extendedVectorB) => extendedVectorA === extendedVectorB,
                        ([[[, extendedVector]]]) => extendedVector
                    )
                )
                .subscribe(([[[clientId, extendedVector]], dataChannelTuples]) => {
                    const externalVector = { ...extendedVector, hops: [...extendedVector.hops, this._origin] };

                    for (const [remoteClientId, send] of dataChannelTuples.filter(isSendPeerToPeerMessageTuple)) {
                        if (!send({ message: externalVector, type: 'update' }) && clientId === remoteClientId) {
                            return;
                        }
                    }

                    this._setInternalVector(extendedVector);
                });
        }

        private _createExtendedVector(hops: number[]): TExtendedTimingStateVector {
            return { ...this._vector, hops, version: this._version };
        }

        private _setInternalVector({ hops, version, ...vector }: TExtendedTimingStateVector): void {
            this._hops = hops;
            this._vector = vector;
            this._version = version;

            this.dispatchEvent(new CustomEvent('change', { detail: vector }));
        }
    };
};
