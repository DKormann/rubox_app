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

  cache: Map<bigint, string>
  requests: Map<bigint, Consumer[]>
  subscriptions: Map<bigint, Consumer[]>

  // producer: (key:bigint)=> void

  constructor(){
    this.cache = new Map<bigint, string>()
    this.requests = new Map<bigint, Consumer[]>()
  }

  request (key: bigint, callback: Consumer, ){
    if (this.cache.has(key)) return callback.resolve(this.cache.get(key)!)
    if (this.requests.has(key)){
      this.requests.get(key).push(callback)
    }else{
      this.requests.set(key, [callback])
    }
  }

  

  reject(key:bigint, e:Error){
    this.requests.get(key)?.forEach(r=>{if (r.reject) r.reject(e)})
    this.requests.delete(key)
    this.cache.set(key, undefined)
  }

  produce(key:bigint, value:any){
    this.requests.get(key)?.forEach(r=>r.resolve(value))
    this.requests.delete(key)
    this.cache.set(key, value)
  }
  

}