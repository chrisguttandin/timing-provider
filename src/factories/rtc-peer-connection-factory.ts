export const createRTCPeerConnectionFactory = (window: null | (Window & typeof globalThis)) => () => {
    if (window === null) {
        throw new Error('A native EventTarget could not be created.');
    }

    return new window.RTCPeerConnection({
        iceCandidatePoolSize: 1,
        iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
    });
};
