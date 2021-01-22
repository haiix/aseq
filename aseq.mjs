/*
 * aseq.mjs
 *
 * Copyright (c) 2021 haiix
 *
 * This module is released under the MIT license:
 * https://opensource.org/licenses/MIT
 */

export const version = '0.1.0'

if (!Symbol.asyncIterator) Symbol.asyncIterator = Symbol('Symbol.asyncIterator')

export class AsyncDispatcher {
  constructor () {
    this._popQue = []
    this._pushQue = []
    this._done = null
    this._error = null
  }

  next () {
    return new Promise((resolve, reject) => {
      if (this._error) {
        reject(this._error.error)
      } else if (this._pushQue.length > 0) {
        resolve(this._pushQue.shift())
      } else if (this._done) {
        resolve(this._done)
      } else {
        this._popQue.push({ resolve, reject })
      }
    })
  }

  dispatch (value) {
    if (this._done || this._error) return
    const result = { done: false, value }
    if (this._popQue.length > 0) {
      this._popQue.shift().resolve(result)
    } else {
      this._pushQue.push(result)
    }
  }

  close () {
    if (this._done || this._error) return
    this._done = { done: true, value: undefined }
    while (this._popQue.length > 0) {
      this._popQue.shift().resolve(this._done)
    }
  }

  throw (error) {
    if (this._done || this._error) return
    this._error = { error }
    this._pushQue.length = 0
    while (this._popQue.length > 0) {
      this._popQue.shift().reject(error)
    }
  }

  [Symbol.asyncIterator] () {
    return this
  }
}

function _agen (callbackfn, thisArg = null) {
  const dispatcher = new AsyncDispatcher()
  ;(async function (dispatcher) {
    try {
      await callbackfn.call(thisArg, v => dispatcher.dispatch(v))
      dispatcher.close()
    } catch (error) {
      dispatcher.throw(error)
    }
  })(dispatcher)
  return new ArrayAsyncIterator(dispatcher)
}

export function q (_ite) {
  return {
    _ite: _ite[Symbol.asyncIterator](),
    value: null,
    async next () {
      const { done, value } = await this._ite.next()
      this.value = value
      return !done
    }
  }
}

export async function toArray (asyncIterator) {
  const arr = []
  const aite = q(asyncIterator)
  while (await aite.next()) arr.push(aite.value)
  return arr
}

export function fromIterator (iterator) {
  return new ArrayAsyncIterator({
    _ite: iterator[Symbol.iterator](),
    async next () {
      return this._ite.next()
    },
    [Symbol.asyncIterator] () {
      return this
    }
  })
}

export class ArrayAsyncIterator {
  constructor (asyncIterator) {
    this._ite = asyncIterator
  }

  concat (...items) {
    return fromIterator([this._ite, ...items]).flat()
  }

  entries () {
    return this.map((v, i) => [i, v])
  }

  async every (callbackfn, thisArg = null) {
    return !await this.map(callbackfn, thisArg).map(v => !!v).includes(false)
  }

  fill (value, start = 0, end = Number.MAX_SAFE_INTEGER) {
    if (start < 0 || end < 0) {
      return _agen(async function (_yield) {
        for (const v of (await toArray(this._ite)).fill(value, start, end)) _yield(v)
      }, this)
    }
    return this.map((v, i) => (i >= start && i < end) ? value : v)
  }

  filter (callbackfn, thisArg = null) {
    return this.flatMap(async function (v, i) { return await callbackfn.call(thisArg, v, i) ? [v] : [] })
  }

  async find (callbackfn, thisArg = null) {
    const aite = q(this._ite)
    for (let i = 0; await aite.next(); ++i) {
      if (await callbackfn.call(thisArg, aite.value, i)) return aite.value
    }
  }

  async findIndex (callbackfn, thisArg = null) {
    const aite = q(this._ite)
    for (let i = 0; await aite.next(); ++i) {
      if (await callbackfn.call(thisArg, aite.value, i)) return i
    }
    return -1
  }

  flat (depth = 1) {
    return _agen(async function (_yield) {
      await (async function recur (asyncIterator, depth) {
        const aite = q(asyncIterator)
        while (await aite.next()) {
          if (depth > 0 && aite.value != null && aite.value[Symbol.asyncIterator]) {
            await recur(aite.value, depth - 1)
          } else if (depth > 0 && aite.value != null && aite.value[Symbol.iterator]) {
            await recur(fromIterator(aite.value), depth - 1)
          } else {
            _yield(aite.value)
          }
        }
      }(this._ite, depth))
    }, this)
  }

  flatMap (mapperFunction, thisArg) {
    return this.map(mapperFunction, thisArg).flat()
  }

  forEach (callbackfn, thisArg = null) {
    return this.map(callbackfn, thisArg).fill(0).find(v => v === 1)
  }

  async includes (searchElement, fromIndex = 0) {
    return await this.indexOf(searchElement, fromIndex) >= 0
  }

  async indexOf (searchElement, fromIndex = 0) {
    if (fromIndex < 0) {
      const arr = await toArray(this._ite)
      return arr.indexOf(...arguments)
    }
    return await this.findIndex((v, i) => i >= fromIndex && v === searchElement)
  }

  async join (separator = ',') {
    const arr = await toArray(this._ite)
    return arr.join(...arguments)
  }

  keys () {
    return this.map((v, i) => i)
  }

  async lastIndexOf (searchElement, fromIndex = undefined) {
    const arr = await toArray(this._ite)
    return arr.lastIndexOf(...arguments)
  }

  map (callbackfn, thisArg = null) {
    return _agen(async function (_yield) {
      const aite = q(this._ite)
      for (let i = 0; await aite.next(); ++i) {
        _yield(await callbackfn.call(thisArg, aite.value, i))
      }
    }, this)
  }

  async reduce (callbackfn, initialValue = undefined) {
    let _value = initialValue
    const aite = q(this._ite)
    for (let i = 0; await aite.next(); ++i) {
      _value = (i === 0 && arguments.length === 1) ? aite.value : await callbackfn(_value, aite.value, i)
    }
    return _value
  }

  async reduceRight (callbackfn, initialValue = undefined) {
    const aite = fromIterator((await toArray(this._ite)).reverse())
    return aite.reduce(...arguments)
  }

  slice (start = 0, end = Number.MAX_SAFE_INTEGER) {
    return _agen(async function (_yield) {
      if (start < 0 || end < 0) {
        for (const v of (await toArray(this._ite)).slice(start, end)) _yield(v)
      } else {
        const aite = q(this._ite)
        for (let i = 0; i < end && await aite.next(); ++i) {
          if (i >= start) _yield(aite.value)
        }
      }
    }, this)
  }

  some (callbackfn, thisArg = null) {
    return this.map(callbackfn, thisArg).map(v => !!v).includes(true)
  }

  values () {
    return new ArrayAsyncIterator(this._ite)
  }

  pipe (asyncGeneratorFunction, ...args) {
    const asyncIterator = asyncGeneratorFunction(this, ...args)
    return asyncIterator instanceof ArrayAsyncIterator ? asyncIterator : new ArrayAsyncIterator(asyncIterator)
  }

  next () {
    return this._ite.next()
  }

  [Symbol.asyncIterator] () {
    return this._ite
  }
}

export default function aseq (iterator, thisArg = null) {
  if (typeof iterator === 'number') {
    return fromIterator(Array(iterator).keys())
  } else if (typeof iterator === 'function' && iterator.constructor && iterator.constructor.name === 'AsyncGeneratorFunction') {
    return new ArrayAsyncIterator(iterator())
  } else if (iterator[Symbol.asyncIterator]) {
    return new ArrayAsyncIterator(iterator)
  } else if (iterator[Symbol.iterator]) {
    return fromIterator(iterator)
  } else if (typeof iterator === 'function' && iterator.constructor && iterator.constructor.name === 'AsyncFunction') {
    return _agen(iterator, thisArg)
  } else {
    throw new TypeError('The given argument is not a number, iterator, async iterator or async function.')
  }
}
