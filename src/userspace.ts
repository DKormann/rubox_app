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
    public identity: Identity,

  ){
    this.conn = conn
    this.callQueue = new Map()
    this.callCounter = 0
  }

  async call (target:IdString, fn:APIFunction<C>, arg?:Serial) : Promise<Serial> {

  
    let res = new Promise<Serial>( ( resolve, reject ) => {
      this.callQueue.set(this.callCounter, [resolve, reject])
    })
    
    this.conn.reducers.callLambda(
      IdentityFromString(target),
      this.hashedApp.hash,
      await hashString(fn.toString()),
      this.callCounter,
      JSON.stringify(arg ?? null))
    
    this.callCounter += 1
    return await res
  }

  users () : Promise<IdString[]> {

    return new Promise<IdString[]>((resolve, reject) => {
      this.conn.subscriptionBuilder()

    })

  }

  static async connect <C> (
    url:string,
    dbname:string,
    tokenStore:{get:()=>string, set:(value:string)=>void},
    box: ServerApp<C>,
    onNotify: (payload:Serial, sender: Identity)=>void = ()=>{}

  ) : Promise<ServerConnection<C>> {
    const storeQueue = new CachedStore()
  
    return new Promise<ServerConnection<C>>((resolve, reject) => {
      DbConnection.builder()
      .withUri(url)
      .withModuleName(dbname)
      .withToken(tokenStore.get())
      .onConnect(async (conn: DbConnection, identity: Identity, token: string) => {

        let result = new ServerConnection<C>(
          conn,
          
          await hashApp({
            setup:box.loadApp.toString(),
            functions: Object.values(box.api).map(fn=>fn.toString())
          }),
          identity);

        const handleReturn = (ret:Return) => {
          let val = JSON.parse(ret.content)
          result.callQueue.get(ret.id)?.[0](val)
          result.callQueue.delete(ret.id)
        }

        const handleNotify = (note:Notification) => {
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
          `SELECT * FROM returns WHERE owner = '${identity.toHexString()}'`,
        ])


        tokenStore.set(token)
        resolve(result)
      })
    })
  }
  
}