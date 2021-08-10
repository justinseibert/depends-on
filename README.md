# dependsOn

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]

A decorator for caching class getters and updating the cache based on dependent properties

## Installation

```sh
npm install @justinseibert/depends-on --save
```

## Usage

Apply decorator to a public `get` accessor. Add `string` identifiers of other properties to the dependency array that will trigger a cache update.

Properties added to the dependency array are also tracked in the cache, but do not require their own decoration.

If the dependencies are unchanged, the accessor will return the last cached value _instead of_ executing it's underlying function.

```js
import dependsOn from '@justinseibert/depends-on'

class Sample {
  someProperty = 1

  public get uncachedGetterProperty() {
    return Math.random() > 0.5
  }

  @dependsOn(['someProperty', 'uncachedGetterProperty', ...])
  public get expensiveOperation() {
    ...
    return value
  }
}
```

```js
const sample = new Sample();
// someProperty = 1
// uncachedGetterProperty = true
let initial = sample.expensiveOperation;

// someProperty = 1
// uncachedGetterProperty = true
console.log(sample.expensiveOperation === initial); // true

// someProperty = 1
// uncachedGetterProperty = false (via random chance)
console.log(sample.expensiveOperation === initial); // false
```

If the dependency array is empty, the value will be permanently cached. The accessor function will only execute the first time.

```js
class Sample {
  @dependsOn([])
  public get permanentlyCachedOperation() {
    ...
    return value
  }
}
```

A setter function will update the cached value and perform any additional computation within.

```js
class Sample {
  count = 0
  bool = false

  @dependsOn(['count'])
  public get random() {
    return Math.random()
  }

  public set random(value) {
    this.bool = value > 1
  }
}
```

```js
const sample = new Sample();
let initial = sample.random; // 0.123

sample.random = 5;
console.log(sample.bool); // true
console.log(initial === sample.random); // false
console.log(sample.random === 5); // true

sample.count++; // 1
console.log(sample.random === 5); // false
```

## License

MIT

[npm-image]: https://img.shields.io/npm/v/@justinseibert/depends-on.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@justinseibert/depends-on
[downloads-image]: https://img.shields.io/npm/dm/@justinseibert/depends-on.svg?style=flat
[downloads-url]: https://npmjs.org/package/@justinseibert/depends-on
[travis-image]: https://travis-ci.org/justinseibert/depends-on.svg?branch=master
[travis-url]: https://travis-ci.org/justinseibert/depends-on
