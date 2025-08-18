
export {}




import { chatView } from "./clients/chatbox"
import { button, div, h2, p } from "./html"
import { Stored } from "./store"
import { connectServer, ServerConnection } from "./userspace"



export type PageComponent = (server:ServerConnection) => HTMLElement



type Location= {
  serverLocal: boolean,
  frontendLocal: boolean,
  path: string[]
} 


const appname = "LamBox"
document.title = appname

function getLocation():Location{

  const items = window.location.pathname.split("/").filter(Boolean)

  const serverLocal = items.includes("local")
  const frontendLocal = ! items.includes(appname)
    
  return {
    serverLocal,
    frontendLocal,
    path: items.filter(x=>x!='local' && x!= appname)
  }
}

let location  = getLocation()


const serverurl = location.serverLocal ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";

connectServer(serverurl, "rubox", new Stored<string>("rubox-token-"+location.serverLocal, "")).then((server:ServerConnection)=>{
  

  const body = document.body;

  const home = () => div(
    h2("home"),
    p("welcome to the rubox"),
    ...apps.filter(x=>x.path).map(app => p(
      button(app.path, {
        onclick: () => {
          route(app.path.split('/'))
        }
      })
    ))
  )


  const apps : {
    init: (server:ServerConnection) => HTMLElement,
    path: string,
    cache? : HTMLElement
  }[] = [
    {init: home, path: "", cache: undefined},
    {init: (server)=>chatView(server), path: "chat", cache: undefined},
    // {init: chessView, path: "chess", cache: undefined},
    // {init: url => Console(url, cmd => eval(cmd)), path: "console", cache: undefined},
    // {init: AntFarm, path: "antfarm", cache: undefined}

  ]

  route(location.path)


  window.addEventListener("popstate", (e) => {
    location = getLocation() 
    route(location.path)
  })


  function route(path: string[]){


    let  newpath = (location.serverLocal? "local" : "") + "/" + (location.frontendLocal? "" : appname) + "/" + path.join('/')
    newpath = window.location.origin + "/" + newpath.split("/").filter(Boolean).join('/')
    
    window.history.pushState({}, "", newpath)
    body.innerHTML = ''
    body.style.fontFamily = "monospace"
    body.style.textAlign = "center"
    for (const app of apps){
      if (app.path === path.join('/')){
        if (!app.cache){
          app.cache = app.init(server)
        }
        body.appendChild(app.cache)
      }
    }
  }



})
