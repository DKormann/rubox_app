export class Writable <T> {
  private value: T
  private listeners: Array<(value: T) => void> = [] 

  constructor(initialValue: T) {
    this.value = initialValue
  }

  get(): T {
    return this.value
  }

  set(newValue: T, force = false): void {
    if (!force && newValue === this.value) return

    this.value = newValue
    for (const listener of this.listeners) {
      listener(newValue)
    }
  }


  update(updater: (value: T) => T, force = false): void {
    const newValue = updater(this.value)
    this.set(newValue, force)
  }

  subscribe(listener: (value: T) => void) {
    this.listeners.push(listener)
    listener(this.value)
  }

  subscribeLater(listener: (value: T) => void){
    this.listeners.push(listener)
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
  }

  set (newValue: T, force=false): void {
    if (force || JSON.stringify(this.get()) !== JSON.stringify(newValue)) {
      super.set(newValue)
      localStorage.setItem(this.key, JSON.stringify(newValue))
    }
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


export function sIf <T> (cond:Writable<boolean>, then:Readable<T>, otherwise?:Readable<T>) : Readable<T | null> {

  let res = new Writable<T | null>(null)
  cond.subscribe(c=>{
    if (c) res.set(then.get())
    else if (otherwise) res.set(otherwise.get())
    else res.set(null)
  })
  then.subscribe(v=>{
    if (cond.get()) res.set(v)
    else if (otherwise) res.set(otherwise.get())
    else res.set(null)
  })
  return res
}

export function sMap <T,U> (source:Readable<T>, mapper:(value:T)=>U) : Readable<U> {

  let res = new Writable<U>(mapper(source.get()))
  source.subscribe(v=>{
    res.set(mapper(v))
  })
  return res
}
