
export {}



[].reduce((a, b) => a + b, "")
import { chatView } from "./clients/chatbox"
import { chessView } from "./clients/chess"

import { button, div, h2, p } from "./html"
import { Stored } from "./store"
import { connectServer, ServerConnection } from "./userspace"
import {chessView as chessView2} from "./clients/chess2"


export type PageComponent = (server:ServerConnection) => HTMLElement






type Location= {
  serverLocal: boolean,
  frontendLocal: boolean,
  path: string[]
} 


const appname = "rubox_app"

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




console.log(location)

// e=>({
//   pushMsg:t=>{
//     let r={sender:e.self,receiver:e.other,message:t};
//     e.DB.set(!1,"messages",[...e.DB.get(!1,"messages")??[],r]),
//     e.DB.set(!0,"messages",[...e.DB.get(!0,"messages")??[],r])
//   }
// })




const serverurl = location.serverLocal ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";

console.log("connecting to server at", serverurl)
const body = document.body;

body.appendChild(h2("loading..."))



connectServer(serverurl, "rubox", new Stored<string>("rubox-token-"+location.serverLocal, "")).then((server:ServerConnection)=>{
  

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
    // {init: (server)=>chessView(server), path: "chess", cache: undefined},
    {init: (server)=>chessView2(server), path: "chess", cache: undefined},

  ]

  route(location.path)


  window.addEventListener("popstate", (e) => {
    location = getLocation() 
    route(location.path)
  })


  function route(path: string[]){

    let  newpath =   "/" + (location.frontendLocal? "" : appname) + "/" + path.join('/') + (location.serverLocal? "/local" : "")
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
