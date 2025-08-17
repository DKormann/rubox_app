import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { App, AppData, DbConnection, Lambda } from "./module_bindings";
import { hashApp, hashFunArgs, hashString } from "./lambox";




type ServerFunction = ( arg:string) => string;


export type DBRow<T extends Serial> = {
  get: () => Promise<T>,
  set: (value: T|undefined) => Promise<void>,
  update: (func: (value: T) => T|undefined) => Promise<void>,
  delete: () => Promise<void>
}

export type DBTable <T extends Serial> = DBRow<T> & {
  other: DBRow<T>,
}


export type DefaultContext = {
  self: IdString,
  other: IdString,

  DB: {
    get: <T> (from_me:boolean, key:string) => T,
    set: <T> (from_me:boolean, key:string, value:T) => void,
  }
}

export type Serial = string | number | boolean | null | Serial [] | { [key: string]: Serial } | [Serial, Serial]


export type APIFunction<C> = (ctx:DefaultContext & C, arg:Serial) => any

export type AppHandle<C> = {
  call:(target:IdString, fn:APIFunction<C>, arg?:Serial) => Promise<any>,
  users:() => Promise<IdString[]>,
}

export type ServerConnection = {
  identity:IdString,
  handle:<C>(box:Box<C>) => Promise<AppHandle<C>>,
}

export type Box<C> = {
  getCtx : (c:DefaultContext) => C
  api: { [key: string]: APIFunction <C> }
}


export type IdString = `id${string}`

export const IdString = (id:Identity)=>{
  return 'id'+id.toHexString() as IdString
}

export const IdentityFromString = (s:IdString)=>{
  return new Identity(s.slice(2))
}


export function connectServer(url:string, dbname:string, tokenStore:{get:()=>string, set:(value:string)=>void}) : Promise<ServerConnection> {

  return new Promise<ServerConnection>((resolve, reject) => {

    DbConnection.builder()
    .withUri(url)
    .withModuleName(dbname)
    .withToken(tokenStore.get())
    .onConnect(async (conn: DbConnection, identity: Identity, token: string) => {

      tokenStore.set(token)

      const storeCache = new Map<bigint, string>();

      conn.subscriptionBuilder()
      .onApplied(c=>{

        c.db.store.onInsert((c,store)=>{
          if (store.owner.data == identity.data){storeCache.set(store.key, store.content)}
        })

        c.db.store.onUpdate((c,old,news)=>{
          if (news.owner.data == identity.data) storeCache.set(news.key, news.content)
        })

        c.reducers.onCallLambda(async (ctx, other, app, lam, arg)=>{
          const key = await hashFunArgs(identity, other, app, lam, arg)
          if (ctx.event.status.tag == "Failed") {
            lamQueue.get(key)?.reject(ctx.event.status.value)
          }
          else {
            lamQueue.get(key)?.resolve(JSON.parse(storeCache.get(key)))
          }

          lamQueue.delete(key)
        })

      })
      .onError(console.error)
      .subscribe([
        `SELECT * FROM store WHERE owner = '${identity.toHexString()}'`,
        `SELECT * FROM app`,
        `SELECT * FROM lambda`,
        `SELECT * FROM host WHERE host = '${identity.toHexString()}'`,
      ])

      const lamQueue = new Map<bigint, {resolve:(result:string)=>void, reject:(error:string)=>void}>();


      const handle : <C>(box:Box<C>) => Promise<AppHandle<C>> = async <C> (box:Box<C>) => {

        let hashed = await hashApp({
          setup:box.getCtx.toString(),
          functions: Object.values(box.api).map(fn=>fn.toString())
        })

        conn.reducers.publish({
          setup:box.getCtx.toString(),
          functions: Object.values(box.api).map(fn=>fn.toString())
        })

        conn.reducers.sethost(hashed.hash, true)

        let call : (target:IdString, fn:APIFunction<C>, arg?:Serial) => Promise<any> = async (target, fn, arg = null) => {
          return new Promise<any>(async (resolve, reject) => {
            const argstring = JSON.stringify(arg);
            const funstring = fn.toString()
            const callH = await hashFunArgs(identity, IdentityFromString(target), hashed.hash, await hashString(funstring), argstring)

            const lamH = await hashString(funstring)

            lamQueue.set(callH, {resolve, reject})
            conn.reducers.callLambda(IdentityFromString(target), hashed.hash, lamH, argstring)
          })
        }

        let users : () => Promise<IdString[]> =  () => {

          return new Promise<IdString[]>(async (resolve, reject) => {
          let sub = conn.subscriptionBuilder()
          .onApplied(c=>{
            sub.unsubscribe()
            resolve(Array.from(c.db.host.iter()).filter(h=>h.app == hashed.hash).map(h=>IdString(h.host)))
          })
          .onError(reject)
          .subscribe([
            `SELECT * FROM host WHERE app = '${hashed.hash}'`,
          ])
          })
        }

        let apphandle: AppHandle<C> = {
          call, users
        }

        return apphandle
      }

      resolve({identity: IdString(identity), handle})
   
    }).build()
  })
  
}


