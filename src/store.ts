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

    for (const listener of this.listeners) {
      listener(newValue)
    }
    this.value = newValue
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

  set (newValue: T): void {
    if (JSON.stringify(this.get()) !== JSON.stringify(newValue)) {
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


