import dependsOn from './index'

describe('dependsOn: cache decorator', () => {
  it('should permanently cache getter', () => {
    class Test {
      bool = false

      @dependsOn([])
      get random() {
        return Math.random()
      }
    }

    const test = new Test()
    const initial = test.random

    expect(test.random).toEqual(initial)
    
    test.bool = true
    const update = test.random
    
    expect(update).toEqual(initial)
    expect(test.random).toEqual(initial)
    expect(test.random).toEqual(update)
  })

  it('should create a map of related dependencies', () => {
    class Test {
      a = 1
      b = 2
      c = 3

      @dependsOn(['a', 'b', 'c'])
      get x() {
        return Math.random()
      }

      @dependsOn(['a', 'x'])
      get y() {
        return Math.random()
      }
    }

    const test = new Test()
    expect(test.x).toEqual(test.x)
    expect(test.y).toEqual(test.y)

    expect((test as any).__dependsOn_isInitialized).not.toBeUndefined()
    expect((test as any).__dependsOn_related.a).toEqual(expect.arrayContaining(['x', 'y']))
    expect((test as any).__dependsOn_related.a).toEqual(expect.not.arrayContaining(['a', 'b', 'c']))
    expect((test as any).__dependsOn_related.b).toEqual(expect.arrayContaining(['x']))
    expect((test as any).__dependsOn_related.c).toEqual(expect.arrayContaining(['x']))
    expect((test as any).__dependsOn_related.x).toEqual(expect.arrayContaining(['y']))
  })

  it ('should create cache on first get', () => {
    class Test {
      i = 0
      bool = true

      @dependsOn(['bool'])
      get counter() {
        return ++this.i
      }
    }

    const test = new Test()
    let initial = test.counter

    expect((test as any).__dependsOn_cache.bool).not.toBeUndefined()
    expect((test as any).__dependsOn_cache.counter).not.toBeUndefined()
    
    expect((test as any).__dependsOn_cache.bool).toEqual(true)
    expect((test as any).__dependsOn_cache.counter).toEqual(1)
  })

  it('should cache getter for one dependent property', () => {
    class Test {
      bool = false

      @dependsOn(['bool'])
      get random() {
        return Math.random()
      }
    }

    const test = new Test()
    const initial = test.random

    expect(test.random).toEqual(initial)
    expect(test.random).toEqual(initial)

    test.bool = true
    const update = test.random
    
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)
  })

  it('should cache getter for multiple dependent properties', () => {
    class Test {
      num = 0
      str = ''

      @dependsOn(['num', 'str'])
      get random() {
        return Math.random()
      }
    }

    const test = new Test()
    let initial = test.random
    expect(test.random).toEqual(initial)
    expect(test.random).toEqual(initial)
    
    test.num = 1
    let update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)

    initial = update
    test.str = 'hello'
    update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)
  })

  it('should cache the getter with shallow equality for dependent object', () => {
    class Test {
      obj = { a: 1, b: { c: 1 } }

      @dependsOn(['obj'])
      get random() {
        return Math.random()
      }
    }

    const test = new Test()
    let initial = test.random

    test.obj.b.c = 2
    let update = test.random
    expect(update).toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)

    initial = update
    test.obj.b = { c: 3 }
    update = test.random
    expect(update).toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)

    initial = update
    test.obj = { ...test.obj }
    update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)
  })

  it('should cache getter and update cache with setter', () => {
    class Test {
      bool = false
      count = 0

      @dependsOn(['bool'])
      get random() {
        return Math.random()
      }

      set random(value: number) {
        this.count ++
      }
    }

    const test = new Test()
    let initial = test.random
    expect(test.random).toEqual(initial)

    test.bool = true
    let update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)

    test.random = 5
    expect(test.count).toEqual(1)
    expect(test.random).toEqual(5)
    expect(test.random).toEqual(5)

    initial = test.random
    update = test.random
    expect(update).toEqual(initial)

    test.bool = false
    update = test.random
    expect(update).not.toEqual(initial)
    expect(test.random).toEqual(update)
    expect(test.random).toEqual(update)
  })

  it('should check for and invalidate related cache items', () => {
    class Test {
      c = 0

      @dependsOn(['c'])
      get a() {
        return Math.random()
      }

      @dependsOn(['a'])
      get b() {
        return Math.random()
      }
    }

    const test = new Test()
    let a = test.a
    let b = test.b
    test.c = 1
    expect(test.a).not.toEqual(a)
    let b1 = test.b
    expect(b1).not.toEqual(b)
    expect(test.b).toEqual(b1)
  })

  it('should create a unique cache per instance', () => {
    class Test {
      i = 0
      update = 0

      @dependsOn(['update'])
      get increment() {
        return ++ this.i
      }
    }

    const testA = new Test()
    const testB = new Test()

    let incA = testA.increment
    testA.update ++
    expect(testA.increment).toEqual(2)
    expect(testA.increment).not.toEqual(incA)
    expect(testA.increment).not.toEqual(incA)
    
    expect(testB.increment).toEqual(1)
    testA.update ++
    testB.update ++
    expect(testA.increment).not.toEqual(testB.increment)
  })

  it('should raise when decorating a non-getter', () => {
    expect(() => {
      class Test {
        @dependsOn([])
        method() {
          /* Empty */
        }
      }
    }).toThrowError(TypeError)
  })
})
