# dependsOn

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]

A decorator for caching class getters and updating the cache based on dependent properties

## Installation

```sh
npm install @justinseibert/depends-on --save
```

## Support

Make sure ES6 [@decorators](https://github.com/tc39/proposal-decorators) are supported in your environment. For instance, in _.tsconfig_:

```json
{
  "compilerOptions": {
    ...
    "experimentalDecorators": true,
  }
}
```

## Usage

### Dependency Array

Apply decorator to a public `get` accessor. Add `string` identifiers of other properties to the dependency array that will trigger a cache update.

Properties added to the dependency array are also tracked in the cache, but do not require their own decoration.

If all of the dependencies are unchanged, the accessor will return the last cached value _instead of_ executing it's underlying function.

```js
import dependsOn from '@justinseibert/depends-on'

class Plant {
  hasWater = true
  hasLight = true

  @dependsOn(['hasWater', 'hasLight'])
  public get canGrow() {
    return this.hasWater && this.hasLight
  }
}
```

### Permanent Caching

If the dependency array is empty, the value of the function will be permanently cached during it's first access.

```js
class Boulder {
  @dependsOn([])
  public get mineralComposition() {
    const feldspar = Math.random()
    const quartz: 1 - feldspar

    return {s
      feldspar,
      quartz,
    }
  }
}
```

### Setter Functions

A setter function will update the cached value and perform any additional computation within.

Related dependencies that are updated within the `set` function are cache-validated so that they do not needlessly trigger a reload during the next `get`

```js
class Lake {
  volume = 100
  topography = [ ... ]

  @dependsOn(['topography', 'volume'])
  public get shoreline() {
    const perimeter = []
    this.topography.forEach((sector) => {
      perimeter.push(...calculatePoints(sector, this.volume))
    })
    return perimeter
  }

  public set shoreline(perimeter) {
    this.volume = calculateVolume(perimeter, this.topography)
  }
}
```

## License

MIT

[npm-image]: https://img.shields.io/npm/v/@justinseibert/depends-on.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@justinseibert/depends-on
[downloads-image]: https://img.shields.io/npm/dm/@justinseibert/depends-on.svg?style=flat
[downloads-url]: https://www.npmjs.com/package/@justinseibert/depends-on
[travis-image]: https://app.travis-ci.com/justinseibert/depends-on.svg?branch=master
[travis-url]: https://app.travis-ci.com/github/justinseibert/depends-on
