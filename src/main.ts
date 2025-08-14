
export {}

import { Identity } from "@clockworklabs/spacetimedb-sdk"


import { DbConnection, ReducerEventContext } from "./module_bindings"
import { Stored, Writable } from "./store";
import { button, div, h2, input, p } from "./html";


const app = new Writable<HTMLElement>(div(

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


  const runres = p("...")
  const intake = input()


  const code = "33";

  conn.reducers.onRunscript((ctx:ReducerEventContext,code) => {
    console.log("Runscript", ctx.event.status)
    console.log("ctx", ctx)
    console.log("with code:",code)
  })

  conn.db.callres.onInsert((c,row)=>{
    console.log("new res:",row)
    runres.innerHTML= row.content
  })


  conn.subscriptionBuilder()
  .onApplied(c=>{
    console.log(c)
  })
  .onError(console.error)
  .subscribe([
    "SELECT * FROM callres"
  ])

  

  conn.reducers.runscript(intake.value)


  app.set(div(
    h2('welcome'),
    runres,
    intake,
    button("run", {
      onclick:()=>{
        conn.reducers.runscript(intake.value)
      }
    }),
  ))
  


}).build()


document.body.appendChild(div(
  app,
  {style:{
    "font-family":"monospace",
    "padding-left": "2em"

  }}
))
