import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { App, AppData, DbConnection, Host, Lambda } from "./module_bindings";
import { hashApp, hashFunArgs, hashStoreKey, hashString } from "./hashing";
import { CachedStore, Writable } from "./store";




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
  get:(keyname:string) => Promise<Writable<any>>
}

export type ServerConnection = {
  identity:IdString,
  handle:<C>(box:ServerApp<C>) => Promise<AppHandle<C>>,
}

export type ServerApp<C> = {
  loadApp : (c:DefaultContext) => C
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
  const storeQueue = new CachedStore()
  
  return new Promise<ServerConnection>((resolve, reject) => {
    



    DbConnection.builder()
    .withUri(url)
    .withModuleName(dbname)
    .withToken(tokenStore.get())
    .onConnect(async (conn: DbConnection, identity: Identity, token: string) => {

      tokenStore.set(token)
      const hostCache = new Writable<{[key:string]:true}>({})

      conn.subscriptionBuilder()
      .onApplied(c=>{

        console.log("APPLIED")
        
        c.db.host.onInsert((c,host:Host)=>{

          if (host.host.data == identity.data){
            hostCache.update(h=>{
              h[host.app.toString()] = true
              return h
            },true)
          }
          
        })

        c.db.store.onInsert((c,store)=>{

          if (store.owner.data == identity.data){
            try{
              console.log("inser", store.key, store.content)
              let [data, logs] = JSON.parse(store.content);
              logs.forEach(console.log)
              storeQueue.produce(store.key, data)
            }catch (e){
              console.info("dropped:", store.content)
            }
          }
        })

        c.db.store.onUpdate((c,old,news)=>{
          if (news.owner.data == identity.data){
            storeQueue.produce(news.key, JSON.parse(news.content))
          }
        })

      })
      .onError(console.error)
      
      .subscribe([
        `SELECT * FROM store WHERE owner = '${identity.toHexString()}'`,
        `SELECT * FROM app`,
        `SELECT * FROM lambda`,
        `SELECT * FROM host WHERE host = '${identity.toHexString()}'`,
      ])



      resolve({
        identity: IdString(identity),
        handle : async <C> (box:ServerApp<C>) => {

          let appHash = (await hashApp({
            setup:box.loadApp.toString(),
            functions: Object.values(box.api).map(fn=>fn.toString())
          })).hash;

          conn.reducers.publish({
            setup:box.loadApp.toString(),
            functions: Object.values(box.api).map(fn=>fn.toString())
          })

          return new Promise<AppHandle<C>>((resolve, reject)=>{
            let hash = appHash.toString()
            hostCache.subscribe(h=>{if (h[hash])resolve({
              call: async (target, fn, arg = null) => {

                const argstring = JSON.stringify(arg);
                const funstring = fn.toString()

                const callH = await hashFunArgs(identity, IdentityFromString(target), appHash, await hashString(funstring), argstring)
                const lamH = await hashString(funstring)

                conn.reducers.callLambda(IdentityFromString(target), appHash, lamH, argstring)
                return storeQueue.request(callH)
              },
              users:() => {

                return new Promise<IdString[]>(async (resolve, reject) => {
                let sub = conn.subscriptionBuilder()
                .onApplied(c=>{
                  sub.unsubscribe()
                  resolve(Array.from(c.db.host.iter()).filter(h=>h.app == appHash).map(h=>IdString(h.host)))
                })
                .onError(reject)
                .subscribe([`SELECT * FROM host WHERE app = '${appHash}'`,])})
              },
              get: async (keyname)=>{
                const key = await hashStoreKey(identity, appHash, keyname)
                return storeQueue.subscribe(key)
              }
            })})
            conn.reducers.sethost(appHash, true)
          })

        }
      })
   
    }).build()
  })
  
}


