import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { App, AppData, DbConnection, Host, Lambda, Return, Store, Notification } from "./module_bindings";
import { hashApp, HashedApp, hashFunArgs, hashString } from "./hashing";
import { CachedStore, Stored, Writable } from "./store";


export type DefaultContext = {
  DB:{
    get: <T> (fromMe: boolean, key:string) => T,
    set: <T> (fromMe: boolean, key:string, value:T) => void,
  }
  self: IdString,
  other: IdString,
  notify: (payload:Serial) => void,
}

export type Serial = string | number | boolean | null | Serial [] | { [key: string]: Serial } | [Serial, Serial]

export type APIFunction<C> = (ctx:DefaultContext & C, arg:Serial) => any
export type ClientFunction = (arg:Serial) => void

export type ServerApp<C> = {
  name: string,
  loadApp : (c:DefaultContext) => C
  api: { [key: string]: APIFunction <C> }
}

export type IdString = `id${string}`
export const IdString = (id:Identity)=>{return 'id'+id.toHexString() as IdString}
export const IdentityFromString = (s:IdString)=> new Identity(s.slice(2))
export type WSSURL = `wss${string}` | `ws${string}`


const servers = new Map<WSSURL, Promise<ServerConnection>>()
type Consumer = (payload:Serial) => void

export class ServerConnection {
  public notifyListeners = new Map<bigint, Consumer>()
  public returnListeners = new Map<bigint,Map<number, {
    resolve: Consumer
    reject: Consumer
  }>>();

  constructor(
    public identity: IdString,
    public server: DbConnection

  ) {}

  static connect(url:WSSURL): Promise<ServerConnection> {

    return new Promise(async (resolve, reject)=>{

      const token = localStorage.getItem(`${url}-token`) ?? ''
      DbConnection.builder()
      .withUri(url)
      .withToken(token)
      .withModuleName("rubox")
      .onConnect(async (conn: DbConnection, identity: Identity, token: string) => {
        localStorage.setItem(`${url}-token`, token)
        let server = new ServerConnection(IdString(identity), conn)
        const handleNotify = (note:Notification) => {server.notifyListeners.get(note.app)?.(JSON.parse(note.arg))}
        const handleReturn = (ret:Return) => {
          let data = JSON.parse(ret.content)
          let [res, logs] = data as [Serial, string[]]
          logs.forEach(console.log)
          let expector = server.returnListeners.get(ret.app)?.get(ret.id)
          expector?.resolve(res)
        }

        conn.subscriptionBuilder()
        .onApplied(c=>{
          c.db.notification.onInsert((c, note:Notification)=>{handleNotify(note)})
          c.db.returns.onInsert((c, ret:Return)=>{handleReturn(ret)})
          c.db.notification.onUpdate((c, old, note:Notification)=>{handleNotify(note)})
          c.db.returns.onUpdate((c, old, ret:Return)=>{handleReturn(ret)})
        })
        .onError(console.error)
        .subscribe([
          `SELECT * FROM notification WHERE target = '${identity.toHexString()}'`,
          `SELECT * FROM returns WHERE owner = '${identity.toHexString()}'`,
        ])
        conn.reducers.onCallLambda((c, o, a, l, id, arg)=>{
          if (c.event.status.tag == "Failed") {
            console.warn("onCallLambda failed", id, c.event.status.value);
            server.returnListeners.get(a)?.get(id)?.reject(c.event.status.value)
          }
        })
        resolve(server)
      })
      .build()
    })
  }

  users(app:bigint): Promise<IdString[]>{
    return new Promise(async (resolve, reject)=>{
      this.server.subscriptionBuilder()
      .onApplied(c=>{
        resolve(Array.from(c.db.host.iter()).filter(h=>h.app == app).map(h=>IdString(h.host)))
      })
      .onError(reject)
      .subscribe([`SELECT * FROM host WHERE app = '${app}'`])
    })
  }
}

export class AppHandle {

  private callCounter: number = 0
  public identity: IdString

  constructor(public app: bigint, public server: ServerConnection){
    this.identity = this.server.identity    
  }
  
  static async connect(url:WSSURL, box: ServerApp<any>, onNotify: (payload:Serial) => void){
    if (!servers.has(url)) {servers.set(url, ServerConnection.connect(url))}

    let app = await hashApp({
      setup:box.loadApp.toString(),
      functions: Object.values(box.api).map(fn=>fn.toString())
    })

    let server = await servers.get(url)
    server.returnListeners.set(app.hash, new Map())
    return new AppHandle(app.hash, server)

  }

  async call(target:IdString, fn:APIFunction<any>, arg:Serial = null): Promise<Serial>{
    return new Promise(async (resolve, reject)=>{
      // important dont rearange funHash
      let funHash = await hashString(fn.toString())
      this.server.returnListeners.get(this.app)?.set(this.callCounter, {resolve,reject})
      this.server.server.reducers.callLambda( IdentityFromString(target), this.app, funHash, this.callCounter, JSON.stringify(arg))
      this.callCounter += 1
    })
  }
  users(){ return this.server.users(this.app)}
}
