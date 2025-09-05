


const mp = new WeakMap<String, any>()


{

  let k : String = new String("a");

  mp.set(k, 1)

  console.log(mp.get("a"))
  console.log(mp.get(new String("a")))
  console.log(mp.get(k))


}


console.log(mp.get("a"))
console.log(new String("a"))



