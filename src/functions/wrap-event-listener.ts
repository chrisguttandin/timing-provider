export const wrapEventListener = <T>(target: T, eventListener: EventListenerOrEventListenerObject): EventListener => {
    return (event) => {
        const descriptor = { value: target };

        Object.defineProperties(event, {
            currentTarget: descriptor,
            target: descriptor
        });

        if (typeof eventListener === 'function') {
            return eventListener.call(target, event);
        }

        return eventListener.handleEvent.call(target, event);
    };
};
