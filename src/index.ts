export interface CachePropertyDescriptor<T, R> extends PropertyDescriptor {
  get?: (this: T) => R
};

const PROPS = `__dependsOn_properties`
const CACHE = `__dependsOn_comparator`

const dependsOn = (dependencies: string[]) => {
  return function <T,R>(target: any, key: PropertyKey, descriptor: CachePropertyDescriptor<T, R>) {
    // adds cache trackers to the object
    if (!target[PROPS]) {
      Object.defineProperty(target, PROPS, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: {},
      })
    }
    if (!target[CACHE]) {
      Object.defineProperty(target, CACHE, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: {},
      })
    }


    // record any existing get/set actions
    const getter = descriptor.get
    const setter = descriptor.set

    if (!getter) {
      throw new TypeError('The dependsOn decorator expects a getter')
    }

    const currentKey = String(key)
    
    descriptor.get = function (this: any) {
      // set all initial values for dependent properties
      if (typeof this[PROPS][currentKey] === 'undefined') {
        // perform only during first access
        dependencies.forEach((dependency: string) => {
          const propertyDescriptor = Object.getOwnPropertyDescriptor(this, dependency)
          if (
            propertyDescriptor &&
            typeof this[PROPS][dependency] === 'undefined'
          ) {
            // current dependency is a property, record new values to cache
            this[PROPS][dependency] = propertyDescriptor.value
            this[CACHE][dependency] = this[PROPS][dependency]
          }
        })
      }


      // add current key to dependencies in order to force initial update
      const shouldUpdate = [...dependencies, currentKey].findIndex((dependency: string) => {
        const propertyDescriptor = Object.getOwnPropertyDescriptor(this, dependency)
        if (
          propertyDescriptor &&
          this[PROPS][dependency] !== propertyDescriptor.value
        ) {
          // current dependency is a property with a new value, record to cache
          this[PROPS][dependency] = propertyDescriptor.value
          this[CACHE][dependency] = this[PROPS][dependency]
          return true
        }

        if (
          typeof this[PROPS][dependency] === 'undefined' ||
          this[PROPS][dependency] !== this[CACHE][dependency]
        ) {
          // current dependency's cached values are new or outdated
          return true
        }

        // cache is in sync
        return false
      }) > -1

      if (shouldUpdate) {
        // needs to update value and cache, run the defined getter function
        this[PROPS][currentKey] = getter.call(this)
      }

      // return the synced cache values
      return this[CACHE][currentKey] = this[PROPS][currentKey]
    }

    // setter wrapper ensures the cache is also updated
    if (setter) {
      descriptor.set = function (this: any, value: any) {
        this[CACHE][currentKey] = this[PROPS][currentKey] = value
        setter && setter.call(this, value)
      }
    }
  }
}

export default dependsOn