# dependsOn

A decorator for caching class getters and updating the cache based on dependent properties

## Installation

```sh
npm install depends-on --save
```

## Usage

Apply decorator to a public `get` accessor. Add `string` identifiers of other properties to the dependency array that will trigger a cache update.

Properties added to the dependency array are also tracked in the cache, but do not require their own decoration.

If the dependencies are unchanged, the accessor will return the last cached value _instead of_ executing it's underlying function.

```js
import dependsOn from 'depends-on'

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

## Example

There's some very complicated calculations here, but I'm really only gonna leave the house if the fridge is empty and I'm feeling it.

```js
import dependsOn from "depends-on"

class Person {
  this.meals = 5
  this.condiments = 20
  this.isFridgeEmpty = false
  this.isFeelingSocial = false

  eatFood() {
    this.meals --
    this.condiments -= 0.25
    if (this.meals / this.condiments < 0.1) {
      this.isFridgeEmpty = true
    }
  }

  getGroceries() {
    this.meals += 5
    this.condiments += 2
    this.isFridgeEmpty = false
  }

  @dependsOn(['isFridgeEmpty', 'isFeelingSocial'])
  get willLeaveHouseToday() {
    const mood = this.calculateMood(
      nextHourForecast(this.location),
      this.isFeelingSocial,
      this.workStress,
      relativePositionOfMercuryToSun(this.sign),
      this.isFridgeEmpty,
      this.coolOutfitAvailability,
      this.childhoodMemories,
      this.abilityToTolerateOtherPeople,
      currentGlobalSociopoliticalLandscape(this.bloodPressure),
      affordabilityOfDeliveryFees(),
      this.likelihoodOfInteractingWithNeighborhoodCats,
    )

    if (mood >= MOOD_LEVELS.DECENT) {
      return Math.random() > 0.5
    }
    return false
  }
}
```

```js
const me = new Person();

let motivation = me.willLeaveHouseToday();
while (motivation === false) {
  me.eatFood();
  motivation = me.willLeaveHouseToday();
}

me.getGroceries();
```

## License

MIT
