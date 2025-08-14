
export {}

import { Identity } from "@clockworklabs/spacetimedb-sdk"


import { App, AppData, DbConnection, ReducerEventContext } from "./module_bindings"
import { Stored, Writable } from "./store";
import { button, div, h2, input, p } from "./html";
import { hashApp, HashedApp } from "./lambox";


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


  let funcode = new Stored<string>(dbname + servermode + "-funcode", "")
  let arg = new Stored<string>(dbname + servermode + "-arg", "")
  let result = new Stored<string>(dbname + servermode + "-result", "")





  const app : AppData = {
    setup : "",
    functions : ['()=>"lam result."'],
  }

  const hashed : HashedApp = await hashApp(app);
  console.log("hashed",hashed)

  conn.subscriptionBuilder()
  .onApplied(c=>{
    console.log(c)
    c.db.app.onInsert((c,app)=>{
      console.log("app inserted",app)
    })
    c.db.host.onInsert((c,host)=>{
      console.log("host inserted",host)
    })
    c.db.store.onInsert((c,store)=>{
      console.log("store inserted",store)
      result.set(store.content)
    })
  })
  .onError(console.error)
  .subscribe([

    "SELECT * FROM app",
    "SELECT * FROM host",
    "SELECT * FROM store",
  ])


  appView.set(div(
    h2('welcome'),
    p("funcode"),
    input(funcode),
    p("arg"),
    input(arg),
    p(),
    
    // button("publish", {
    //   onclick:()=>{
    //     conn.reducers.publish(app)
    //   }
    // }),
    // button("host",{
    //   onclick:()=>{
    //     conn.reducers.sethost(hashed.hash,true)
    //   }
    // }),
    // button("unhost",{
    //   onclick:()=>{
    //     conn.reducers.sethost(hashed.hash,false)
    //   }
    // }),
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
