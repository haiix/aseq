# aseq.mjs

A JavaScript module that allows asynchronous iterators to use array-like methods.

There is also a synchronous version: https://github.com/haiix/seq

## Installation

```
npm install @haiix/aseq
```

## Usage

```javascript
import aseq, * as aseqUtil from '@haiix/aseq'
```

## Examples

1.  By passing the natural number N to the aseq function, an async iterator is created that increments between 0 and N.
    You can use array-like methods (map, join, etc.) on the created async iterator.

    ```javascript
    await aseq(3).join() // "0,1,2"
    ```

    ```javascript
    await aseq(4).map(x => x + 1).join() // "1,2,3,4"
    ```

2.  You can pass an async iterable object (with the [Symbol.asyncIterator] method) to the aseq function.

    ```javascript
    await aseq([10, 20, 30]).map(x => x + 1).join() // "11,21,31"
    ```

3.  There are no methods implemented that rewrite themselves.
    If you want to use those methods, convert them to arrays once.

    ```javascript
    //aseq(5).reverse() // Error
    (await aseqUtil.toArray(aseq(5))).reverse() // [4, 3, 2, 1, 0]
    ```

4.  In this example, the value is returned when the result of indexOf is found, without waiting for the original processing to finish.

    ```javascript
    await aseq(100).map(x => x * 2).filter(x => x % 3 > 0).indexOf(16) // 5
    ```

5.  The iterator created by the aseq function can be used in a for-await-of statement.
    Use in processing with side effects.

    ```javascript
    for await (const n of aseq(3)) {
      console.log(n) // 0, 1, 2
    }
    ```

    ```javascript
    for await (const elem of aseq(3).map(n => document.createElement('input'))) {
      document.body.appendChild(elem)
    }
    ```
