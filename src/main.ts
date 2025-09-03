
export {}


import { ChatService } from "./clients/chatbox"
import { button, div, h2, p } from "./html"
import { ServerConnection, WSSURL } from "./userspace"
import {ChessService } from "./clients/chess2"


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


const serverurl : WSSURL = location.serverLocal ? "ws://localhost:3000" : "wss://maincloud.spacetimedb.com";
const body = document.body;
body.appendChild(h2("loading..."))



async function setup(){
  let server =  await ServerConnection.connect(serverurl)
  
  const home = () => div(
    h2("welcome to the rubox"),
    p("This is a simple app to demonstrate the use of the Rubox framework."),
  
    ...apps.filter(x=>x.path).map(app => p(
      button(app.path, {
        onclick: () => {
          route(app.path.split('/'), server)
        }
      })
    ))
  )

  const apps : {
    render: (server:ServerConnection) => Promise<HTMLElement> | HTMLElement,
    path: string,
    cache? : HTMLElement
  }[] = [
    {render: home, path: ""},
    {render: (server) => new ChatService(server).render(), path: "chat"},
    {render: (server) => new ChessService(server).render(), path: "chess"},
  ]

  route(location.path,server)

  window.addEventListener("popstate", (e) => {
    location = getLocation() 
    route(location.path, server)
  })
  
  function route(path: string[], server:ServerConnection){
  
    let  newpath =   "/" + (location.frontendLocal? "" : appname) + "/" + path.join('/') + (location.serverLocal? "/local" : "")
    newpath = window.location.origin + "/" + newpath.split("/").filter(Boolean).join('/')
    
    window.history.pushState({}, "", newpath)
    body.innerHTML = ''
    body.appendChild(div(
      {style:{
        "max-width": "20em",
        position: "absolute",
        top: "0",
        left: "1em",
        cursor: "pointer",
      },
        onclick: () => {
          route([], server)
        }},
      h2("rubox"),
  
    ))
    body.style.fontFamily = "monospace"
    body.style.textAlign = "center"
    for (const app of apps){
      if (app.path === path.join('/')){
        if (!app.cache){
          app.cache = div(app.render(server))
        }
        body.appendChild(app.cache)
      }
    }
  }
}

setup()


