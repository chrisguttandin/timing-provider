# timing-provider

**An implementation of the timing provider specification.**

[![tests](https://img.shields.io/travis/chrisguttandin/timing-provider/master.svg?style=flat-square)](https://travis-ci.org/chrisguttandin/timing-provider)
[![dependencies](https://img.shields.io/david/chrisguttandin/timing-provider.svg?style=flat-square)](https://www.npmjs.com/package/timing-provider)
[![version](https://img.shields.io/npm/v/timing-provider.svg?style=flat-square)](https://www.npmjs.com/package/timing-provider)

This is an implementation of a TimingProvider as it is defined by the
[Timing Object specification](http://webtiming.github.io/timingobject/). It uses
WebRTC to communicate between the connected clients.

## Installation

This package is available on
[npm](https://www.npmjs.org/package/timing-provider) and can be installed by
running npm's install command.

```shell
npm install timing-provider
```

## Usage

This package exposes the `TimingProvider` class which can be used to instantiate
a TimingProvider.

```js
import { TimingProvider } from 'timing-provider';

const timingProvider = new TimingProvider('aSuperSecretClientId');
```

The only constructor argument the TimingProvider expects is the clientId. This
is unfornately necessary to do the signaling process which establishes the
WebRTC connection. Currently there is no automated way to get a clientId. Please
send a quick email to [info@media-codings.com](mailto:info@media-codings.com) if
you like to have a clientId for your project.

The TimingProvider can be used with the TimingObject of the
[timing-object package](https://github.com/chrisguttandin/timing-object).
