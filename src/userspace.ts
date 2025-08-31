import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { App, AppData, DbConnection, Host, Lambda, Return, Store, Notification } from "./module_bindings";
import { hashApp, HashedApp, hashFunArgs, hashStoreKey, hashString } from "./lambox";
import { CachedStore, Writable } from "./store";


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
  loadApp : (c:DefaultContext) => C
  api: { [key: string]: APIFunction <C> }
}


export type IdString = `id${string}`

export const IdString = (id:Identity)=>{
  return 'id'+id.toHexString() as IdString
}

export const IdentityFromString = (s:IdString)=> new Identity(s.slice(2))

export class ServerConnection <C> {

  private conn: DbConnection
  private callQueue: Map<number, [( value:any ) => void, ( e:Error ) => void]> = new Map()
  private callCounter: number
  

  constructor(
    conn: DbConnection,
    private hashedApp: HashedApp,
    public identity: IdString,

  ){
    this.conn = conn
    this.callQueue = new Map()
    this.callCounter = 0

    this.conn.reducers.sethost(this.hashedApp.hash, true)

  }

  async call (target:IdString, fn:APIFunction<C>, arg?:Serial) : Promise<Serial> {

    let callid = this.callCounter
    this.callCounter += 1

    let res = new Promise<Serial>( async ( resolve, reject ) => {
      this.callQueue.set(callid, [resolve, reject])
      this.conn.reducers.callLambda(
        IdentityFromString(target),
        this.hashedApp.hash, await hashString(fn.toString()),
        callid, JSON.stringify(arg ?? null)
      )
    })

    const ret = await res;
    let [data, logs] = ret as [Serial, string[]];
    if (logs.length) {
      logs.forEach(console.log);
    }
    return data;
  }

  users () : Promise<IdString[]> {

    return new Promise<IdString[]>((resolve, reject) => {
      this.conn.subscriptionBuilder()

      .onApplied(c=>{
        resolve(Array.from(c.db.host.iter()).filter(h=>h.app == this.hashedApp.hash).map(h=>IdString(h.host)))
      })
      .onError(reject)
      .subscribe([`SELECT * FROM host WHERE app = '${this.hashedApp.hash}'`])

    })

  }

  static async connect <C> (
    url:string,
    dbname:string,
    tokenStore:{get:()=>string, set:(value:string)=>void},
    box: ServerApp<C>,
    onNotify: (payload:Serial, sender: Identity)=>void = ()=>{}

  ) : Promise<ServerConnection<C>> {
  
    return new Promise<ServerConnection<C>>((resolve, reject) => {
      DbConnection.builder()
      .withUri(url)
      .withModuleName(dbname)
      .withToken(tokenStore.get())
      .onConnectError(console.error)
      .onConnect(async (conn: DbConnection, identity: Identity, token: string) => {


        const appData = {
          setup:box.loadApp.toString(),
          functions: Object.values(box.api).map(fn=>fn.toString())
        }

        conn.reducers.publish(appData)

        let result = new ServerConnection<C>(
          conn,
          await hashApp(appData),
          IdString(identity));

        const handleReturn = (ret:Return) => {
          let val = JSON.parse(ret.content)
          let expector = result.callQueue.get(ret.id)
          if (expector == undefined) return
          expector[0](val)
          result.callQueue.delete(ret.id)
        }


        conn.reducers.onCallLambda((c, o, a, l, id, arg)=>{
          if (c.event.status.tag == "Failed") {
            console.log("callLambda failed", id)
            result.callQueue.get(id)?.[1](new Error(c.event.status.value))
            result.callQueue.delete(id)
          }
        })

        const handleNotify = (note:Notification) => {
          console.log("handleNotify", note)
          let val = JSON.parse(note.arg)
          onNotify(val, note.sender)
        }

        conn.subscriptionBuilder()

        .onApplied(c=>{
          c.db.returns.onInsert((c, ret:Return)=>{handleReturn(ret)})
          c.db.returns.onUpdate((c, old, ret)=>{handleReturn(ret)})
          c.db.notification.onInsert((c, note:Notification)=>{handleNotify(note)})
          c.db.notification.onUpdate((c, old, note)=>{handleNotify(note)})
        })
        .onError(console.error)
        .subscribe([
          `SELECT * FROM host WHERE host = '${identity.toHexString()}'`,
          `SELECT * FROM notification WHERE target = '${identity.toHexString()}'`,
          `SELECT * FROM returns WHERE owner = '${identity.toHexString()}'`,
        ])


        tokenStore.set(token)
        resolve(result)
      })
      .build()
    })
  }
  
}