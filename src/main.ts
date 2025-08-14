
export {}

import { Identity } from "@clockworklabs/spacetimedb-sdk"


import { App, AppData, DbConnection, ReducerEventContext } from "./module_bindings"
import { Stored, Writable } from "./store";
import { button, div, h2, input, p } from "./html";
import { hashApp, HashedApp, hashFunArgs, hashString } from "./lambox";


const appView = new Writable<HTMLElement>(div(

  h2("connecting")

));

const servermode : 'local'|'remote' = (window.location.pathname.split("/").includes("local")) ? 'local' : 'remote';


const serverurl = (servermode == 'local') ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";
const dbname = "rubox"
const dbtoken = new Stored<string>(dbname + servermode + "-token", "");


DbConnection.builder()
.withUri(serverurl)
.withModuleName(dbname)
.withToken(dbtoken.get())
.onConnect(async (conn: DbConnection, identity: Identity, token: string) => {

  dbtoken.set(token)


  let funcode = new Stored<string>(dbname + servermode + "-funcode", "")
  let arg = new Stored<string>(dbname + servermode + "-arg", "")
  let result = new Stored<string>(dbname + servermode + "-result", "")


  const app : AppData = {
    setup : "",
    functions : ['()=>"lam result."'],
  }

  const storeCache = new Map<bigint, string>();

  conn.subscriptionBuilder()
  .onApplied(c=>{  
    c.db.host.onInsert((c,host)=>{
      console.log("host inserted",host)
    })
    c.db.store.onInsert((c,store)=>{
      if (store.owner.data == identity.data){
        storeCache.set(store.key, store.content)
      }
    })

    c.reducers.onCallLambda(async (ctx, other, app, lam, arg)=>{
      const key = await hashFunArgs(identity, other, app, lam, arg)
      if (ctx.event.status.tag == "Failed") {
        result.set(ctx.event.status.value)
      }else{
        result.set(storeCache.get(key) || "<not found>")
      }
    })
    
  })
  .onError(console.error)
  .subscribe([

    `SELECT * FROM host WHERE host = '${identity.toHexString()}'`,
    `SELECT * FROM store WHERE owner = '${identity.toHexString()}'`,
  ])


  appView.set(div(
    h2('welcome'),
    p("funcode"),
    input(funcode),
    p("arg"),
    input(arg),
    p(),

    button("call",{
      onclick:async()=>{

        let app : AppData ={
          setup : "",
          functions : [funcode.get()],
        }

        const hashed = await hashApp(app)

        conn.reducers.publish(app)
        conn.reducers.sethost(hashed.hash,true)
        conn.reducers.callLambda(
          conn.identity,
          hashed.hash,
          hashed.lambdas[0],
          arg.get()
        )
      }
    }),
    p(result)
  ))


}).build()


document.body.appendChild(div(
  appView,
  {style:{
    "font-family":"monospace",
    "padding-left": "2em"

  }}
))
