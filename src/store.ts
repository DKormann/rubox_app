export class Writable <T> {
  private value: Promise<T>
  private resolved: T
  private previous?: T
  private listeners: Array<(value: T) => void> = [] 
  private listeners_once: Array<(value: T) => void> = []

  constructor(initialValue: T | Promise<T>) {

    this.set(initialValue)
  }

  set (newValue: T | Promise<T>, force = false){

    if (newValue instanceof Promise){
      if (!force && newValue == this.value) return
      this.previous = this.resolved
      this.resolved = undefined

      this.value = newValue
      this.value.then(v=>{
        if (newValue != this.value) return
        this.resolved = v
        if (v == this.previous)return
        this.listeners.forEach(l=>l(v))
        this.listeners_once.forEach(l=>l(v))
        this.listeners_once = []
      })
    }else{
      if (!force && newValue == this.resolved) return
      this.value = Promise.resolve(newValue)
      this.resolved = newValue
      this.listeners.forEach(l=>l(newValue))
      this.listeners_once.forEach(l=>l(newValue))
      this.listeners_once = []
    }
  }

  subscribe(listener: (value: T) => any){
    this.listeners.push(listener)
    if (this.resolved != undefined) listener(this.resolved)
  }

  subscribeLater(listener: (value: T) => any){
    this.listeners.push(listener)
  }

  get(): Promise<T>{
    return new Promise((resolve, reject)=>{

      if(this.resolved != undefined) return resolve(this.resolved)
      
      let sub = (res:T) => {
        resolve(res)
      }
      
      this.listeners_once.push(sub)
    })
  }

  then<U>(fn: (value: T) => U): Promise<U>{
    return this.get().then(fn)
  }

  update(fn: (value:T) => T | Promise<T>, force = false){
    this.set(this.get().then(fn), force)
  }


  map<U>(mapper: (value: T) => U){
    let res = new Writable<U>(new Promise(()=>{}))
    this.subscribe(v=>{
      res.set(mapper(v))
    })
    return res
  }
}


export class Stored<T> extends Writable<T> {
  key: string
  constructor(key:string, initialValue: T) {
    if (localStorage.getItem(key) !== null) {
      initialValue = JSON.parse(localStorage.getItem(key) as string) as T
    }
    super(initialValue)
    this.key = key

    this.subscribe(v=>{
      localStorage.setItem(this.key, JSON.stringify(v))
    })
  }
}

export interface Readable<T> {
  get(): T
  subscribe(listener: (value: T) => void): void
  subscribeLater(listener: (value: T) => void): void
}

export type Consumer = {
  resolve : (value:any) => void
  reject? : (e:Error) => void
}

export class CachedStore {

  requests: Map<bigint, Consumer[]>
  subscriptions: Map<bigint, Writable<any>>


  constructor(){
    this.requests = new Map<bigint, Consumer[]>()
    this.subscriptions = new Map<bigint, Writable<any>>()

  }

  request (key:bigint) : Promise<any> {
    return new Promise((resolve, reject)=>{

      if (this.subscriptions.has(key)) resolve(this.subscriptions.get(key).get())
      if (!this.requests.has(key)) this.requests.set(key, [])
      this.requests.get(key).push({resolve,reject})
    })
  }

  subscribe(key:bigint){
    
    if (!this.subscriptions.has(key))
      this.subscriptions.set(key, new Writable<any>(null))
    return this.subscriptions.get(key)
  }

  reject(key:bigint, e:Error){
    this.requests.get(key)?.forEach(r=>{if (r.reject) r.reject(e)})
    this.requests.delete(key)
    this.subscriptions.get(key).set(e)
  }

  produce(key:bigint, value:any){
    this.requests.get(key)?.forEach(r=>r.resolve(value))
    this.requests.delete(key)
    if (!this.subscriptions.has(key))
      this.subscriptions.set(key, new Writable<any>(null))
    this.subscriptions.get(key)!.set(value)
  }
  

}


// export function sIf <T> (cond:Writable<boolean>, then:Readable<T>, otherwise?:Readable<T>) : Readable<T | null> {

//   let res = new Writable<T | null>(null)
//   cond.subscribe(c=>{
//     if (c) res.set(then.get())
//     else if (otherwise) res.set(otherwise.get())
//     else res.set(null)
//   })
//   then.subscribe(v=>{
//     if (cond.get()) res.set(v)
//     else if (otherwise) res.set(otherwise.get())
//     else res.set(null)
//   })
//   return res
// }

// export function sMap <T,U> (source:Readable<T>, mapper:(value:T)=>U) : Writable<U> {

//   let res = new Writable<U>(mapper(source.get()))
//   source.subscribe(v=>{
//     res.set(mapper(v))
//   })
//   return res
// }
