import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { App, AppData, DbConnection, Lambda, Return, Store, Notification } from "./module_bindings";
import { hashApp, HashedApp, hashFunArgs, hashStoreKey, hashString } from "./hashing";
import { CachedStore, Stored, Writable } from "./store";


export type DefaultContext = {
  DB:{
    get: <T> (owner:IdString, key:string) => T,
    set: <T> (owner:IdString, key:string, value:T) => void,
  }
  self: IdString,
  notify: (target:IdString, payload:Serial) => void,
}

export type Serial = string | number | boolean | null | Serial [] | { [key: string]: Serial } | [Serial, Serial]
export type APIFunction<C, A, R> = (ctx:DefaultContext & C, arg:A) => R
export type ClientFunction = (arg:Serial) => void
export type ServerApp<C> = {
  name: string,
  loadApp : (c:DefaultContext) => C
  api: { [key: string]: APIFunction <C, Serial, any> }
}

export type IdString = `id${string}`
export const IdString = (id:Identity)=>{return 'id'+id.toHexString() as IdString}
export const IdentityFromString = (s:IdString)=> new Identity(s.slice(2))
export type WSSURL = `wss${string}` | `ws${string}`


const servers = new Map<WSSURL, Promise<ServerConnection>>()
type Consumer= (payload:Serial) => void

export class ServerConnection {
  public notifyListeners = new Map<bigint, Consumer>()
  public returnListeners = new Map<bigint,Map<number, {
    resolve: (value:any) => void
    reject: Consumer
  }>>();

  constructor(
    public identity: IdString,
    public server: DbConnection
  ) {

  }

  static connect(url:WSSURL, token:string): Promise<[ServerConnection, string]> {


    return new Promise(async (resolve, reject)=>{


      DbConnection.builder()
      .withUri(url)
      .withToken(token)
      .withModuleName("rubox")
      .onConnect(async (conn: DbConnection, identity: Identity, token: string) => {

        localStorage.setItem(`${url}-token`, token)
        let server = new ServerConnection(IdString(identity), conn)
        const handleNotify = (note:Notification) => {server.notifyListeners.get(note.app)?.(JSON.parse(note.arg))}
        const handleReturn = (ret:Return) => {

          if (!ret.app){return}

          if (ret.logs.length > 0){
            console.info("logs:");
            ret.logs.forEach(l => console.log(l))
          }
          let expector = server.returnListeners.get(ret.app)?.get(ret.id);
          if (!expector){return}
          (ret.result.tag == "Ok" ? expector.resolve(JSON.parse(ret.result.value)) : expector.reject(ret.result.value))

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
        conn.reducers.onCallLambda(( c, a, l, id, arg)=>{
          if (c.event.status.tag == "Failed") {
            console.warn("onCallLambda failed", id, c.event.status.value);
            server.returnListeners.get(a)?.get(id)?.reject(c.event.status.value)
          }
        })
        resolve([server, token])
      })
      .onConnectError(e=>{
        reject(e)
      })
      .build()
    })
  }

  users(app:bigint): Promise<IdString[]>{

    return new Promise(async (resolve, reject)=>{
      this.server.subscriptionBuilder()
      .onApplied(c=>{resolve(Array.from(c.db.host.iter()).filter(h=>h.app == app).map(h=>IdString(h.host)))})
      .onError(console.error)
      .subscribe([`SELECT * FROM host WHERE app = ${ app.toString()}`])
    })
  }
}

export class AppHandle {

  private callCounter: number = 0
  public identity: IdString
  public app: Promise<bigint>


  constructor(
    public server: ServerConnection,
    box: ServerApp<any>,
    onNotify: (payload:Serial) => void
  ){
    this.identity = server.identity

    let appData = {
      setup:box.loadApp.toString(),
      functions: Object.values(box.api).map(fn=>fn.toString())
    }
    server.server.reducers.publish(appData)
    this.app = hashApp(appData).then(app=>{
      let appHash = app.hash
      server.notifyListeners.set(appHash, onNotify)
      server.returnListeners.set(appHash, new Map())
      server.server.reducers.setHost(appHash, true)
      return app.hash
    })
  }

  async call<R, A extends Serial>(fn:APIFunction<any, A, R>, arg:A = null): Promise<R>{

    if (!fn){
      throw new Error("fn must be a function: " + fn)
    }
    return new Promise(async (resolve, reject)=>{
      let funHash = await hashString(fn.toString())
      let appHash = await this.app
      this.server.returnListeners.get(appHash)?.set(this.callCounter, {resolve,reject})
      this.server.server.reducers.callLambda( appHash, funHash, this.callCounter, JSON.stringify(arg))
      this.callCounter += 1
    })
  }
  async users():Promise<IdString[]>{
    return this.server.users(await this.app)
  }
}
