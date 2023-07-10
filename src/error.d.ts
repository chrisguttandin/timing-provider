// tslint:disable-next-line:interface-name
interface ErrorOptions {
    cause?: unknown;
}

// tslint:disable-next-line:interface-name
interface ErrorConstructor {
    // tslint:disable-next-line:callable-types
    new (message?: string, options?: ErrorOptions): Error;
}
