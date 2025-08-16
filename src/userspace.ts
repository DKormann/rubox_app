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
  self: Identity,
  other: Identity,

  DB: {
    get: (from_me:boolean, key:string) => Serial,
    set: (from_me:boolean, key:string, value:Serial) => void,
  }
}

export type Serial = string | number | boolean | null | Serial [] | { [key: string]: Serial } | [Serial, Serial]


export type APIFunction<C> = (ctx:DefaultContext & C, arg:Serial) => void | Serial

export type AppHandle<C> = (target:Identity, fn:APIFunction<C>, arg?:Serial) => Promise<any>

export type ServerConnection = 
  {
    identity:Identity,
    handle:<C>(box:Box<C>) => Promise<AppHandle<C>>
  }




export type Box<C> = {
  getCtx : (c:DefaultContext) => C
  api: { [key: string]: APIFunction <C> }
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
          console.log("insert", store)
          if (store.owner.data == identity.data){storeCache.set(store.key, store.content)}
        })
    
        c.db.store.onUpdate((c,old,news)=>{
          console.log("update", old, news)
          if (news.owner.data == identity.data) storeCache.set(news.key, news.content)
        })

    
        c.reducers.onCallLambda(async (ctx, other, app, lam, arg)=>{
          const key = await hashFunArgs(identity, other, app, lam, arg)
          if (ctx.event.status.tag == "Failed") {
            console.error(ctx.event.status.value);
            lamQueue.get(key)?.reject(ctx.event.status.value)
          }
          else {
            console.log("success", key, storeCache.get(key))
            lamQueue.get(key)?.resolve(storeCache.get(key))
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

      const handle = async (box:Box<any>) => {

        const app: AppData = {
          setup:box.getCtx.toString(),
          functions: Object.values(box.api).map(fn=>fn.toString())
        }

        const hashed = await hashApp(app)

        console.log("publishing app", app)
        conn.reducers.publish(app)
        console.log("setting host", hashed.hash)
        conn.reducers.sethost(hashed.hash, true)

        const appHandle:AppHandle<any> = async (target, fn, arg = null) => {

          return new Promise(async (resolve, reject) => {

            const argstring = JSON.stringify(arg);
            const funstring = fn.toString()
            const callH = await hashFunArgs(identity, target, hashed.hash, await hashString(funstring), argstring)

            const lamH = await hashString(funstring)

            console.log("calling lambda", callH, argstring)
            lamQueue.set(callH, {resolve, reject})
            conn.reducers.callLambda(target, hashed.hash, lamH, argstring)
          })
        }
        return appHandle
      }
      resolve({identity,handle})
   
    }).build()
  })
  
}


