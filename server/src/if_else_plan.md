

how to incoroporate if else into pure function? 

since if else cannot produce a value they can only return the function or have side effects




```js

if (x > 0){
  set("x", 1)
  return x
}else{
  set("x", 2)
}

e

```


translate to fun script conditionals allow for non-js let bindings


```funscript
let cancel = if (x > 0){
  set("x", 1)
  some(x)
}else{
  set("x", 2)
  none
}

return cancel ? x : e

```





