import { Identity } from "@clockworklabs/spacetimedb-sdk"
import { AppData, DbConnection } from "./module_bindings"
import { Stored, Writable } from "./store";
import { button, div, h2, input, p } from "./html";
import { hashApp, hashFunArgs } from "./lambox";

const appView = new Writable<HTMLElement>(div(h2("connecting")));
const servermode : 'local'|'remote' = (window.location.pathname.split("/").includes("local")) ? 'local' : 'remote';
const serverurl = (servermode == 'local') ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";
const dbname = "rubox"
const dbtoken = new Stored<string>(dbname + servermode + "-token", "");

const {log} = console;


DbConnection.builder()
.withUri(serverurl)
.withModuleName(dbname)
.withToken(dbtoken.get())
.onConnect(async (conn: DbConnection, identity: Identity, token: string) => {

  dbtoken.set(token)
  let funcodes = new Stored<string[]>(dbname + servermode + "-funcodes", [])

  console.log(funcodes.key);

  let result = new Stored<string>(dbname + servermode + "-result", "")
  const storeCache = new Map<bigint, string>();

  conn.subscriptionBuilder()
  .onApplied(c=>{  
    c.db.host.onInsert((c,host)=>{})
    console.log(identity.data)
    c.db.store.onInsert((c,store)=>{

      if (store.owner.data == identity.data){
        console.log("insert", store)
        storeCache.set(store.key, store.content)
      }
    })

    c.db.store.onUpdate((c,old,news)=>{
      if (news.owner.data == identity.data){
        console.log("update", old, news)
        storeCache.set(news.key, news.content)
      }
    })

    c.reducers.onCallLambda(async (ctx, other, app, lam, arg)=>{
      const key = await hashFunArgs(identity, other, app, lam, arg)
      if (ctx.event.status.tag == "Failed") result.set(ctx.event.status.value)
      else {
        let res = storeCache.get(key)
        result.set(res == undefined ? "<not in cache>" : res)
      }
    })

  })
  .onError(console.error)
  .subscribe([
    `SELECT * FROM host WHERE host = '${identity.toHexString()}'`,
    `SELECT * FROM store WHERE owner = '${identity.toHexString()}'`,
  ])

  console.log("identity", identity.toHexString())

  const funinputs = new Writable<HTMLElement[]>([]);

  let DBGet = (a:boolean, key:string)=>{return "null"};
  let DBSet = (a:boolean, key:string, value:string)=>{return null};


  funcodes.subscribe(fs =>{
    log(fs)
    const addone = input()
    addone.oninput = () =>{
      funcodes.update(fs => [...fs, addone.value])
    }
    funinputs.set([
      ...fs.map((f,i) => {
        const ip = input(f, {style:{width:"20em"}})
        ip.oninput = ()=>{
          funcodes.update(fs => {
            fs[i] = ip.value
            return fs
          }, true)
        }
        const arginput = input()
        arginput.placeholder = "arg"
        return p(
          `f${i}:`,
          ip,
          button("remove", {onclick:()=>{funcodes.update(fs => fs.filter((_,j)=>j!=i))}}),
          button("call", {onclick:async()=>{
            const arg = arginput.value
            const app : AppData = { setup : "", functions: funcodes.get()}
            const hashed = await hashApp(app)
            conn.reducers.publish(app)
            conn.reducers.sethost(hashed.hash,true)
            conn.reducers.callLambda(
              conn.identity,
              hashed.hash,
              hashed.lambdas[i],
              arg
            )
          }}),
          arginput
        )
      }),
      button("+f", {onclick:()=>{funcodes.update(fs => [...fs, ""])}})
    ])
  })

  appView.set(div(
    h2('welcome'),
    p("funcode"),
    funinputs,
    p(),
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
