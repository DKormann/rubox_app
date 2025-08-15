

# Funscript grammar

funscript is a pure functional subset of javascript. any funscript code is also valid js code, but not vice versa.

funscript does not allow mutation of variables, and does not allow mutation of properties of objects.




## Syntax


E :=
  | x // variable
  | int32 // integer literal
  | float64 // float literal
  | string // string literal
  | boolean // boolean literal
  | null // null literal
  | undefined // undefined literal

  | E(E) // function call
  | (x,*) => E // function definition
  | let x = E; E // let declaration
  | E ? E : E // conditional

  | E `op` E // binary operation
  | [(E,)*] // array constructor
  | {(x:E,)*} // object constructor
  | E.x // property access
  | E[E] // array access

  | (x,*) => {
      E;
      return E;
    } // function definition with code block



## examples

valid funscript:

```js
let x = 1;
let y = 2;
let z = x + y;
```

```js
(x) => {
  let x = 1;
  let y = 2;
  let z = x + y;
  return [z, z + 1];
}
```

invalid funscript:

```js
let x = 1;
x = 2;
```

```js
(x) => {
  let x = {y: 1} // not allowed: mutation of object property
  x.y = 2; // not allowed no return statement
}

