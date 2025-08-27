import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { button, div, h2, input, p, popup } from "../html";
import { PageComponent } from "../main";
import { ServerApp, DefaultContext, IdString, ServerConnection } from "../userspace";
import { Stored, Writable } from "../store";


type ChatCtx = {
  pushMsg: (msg:string)=>void
}

type Msg = {
  sender:IdString,
  receiver:IdString,
  message:string
}

export const msgApp : ServerApp<ChatCtx> = {
  loadApp: (c:DefaultContext) => {
    return {
      pushMsg: (msg:string)=>{
        let d:Msg = {
          sender: c.self,
          receiver: c.other,
          message: msg
        };
        let t = c.DB.set(false, "messages", [...c.DB.get<Msg[]> (false, "messages") ?? [], d]);
        c.DB.set(true, "messages", [...c.DB.get<Msg[]> (true, "messages") ?? [], d])
      }

    }
  },
  api: {

    setname:(ctx, arg)=>{
      ctx.DB.set(true, "name", arg)
    },

    getname:(ctx,arg)=>{
      let a = 2;
      return ctx.DB.get(false, "name")
    },

    sendMessage:(ctx,arg:string)=>{
      ctx.pushMsg(arg)
    },

    getMessages:(ctx,arg)=>{
      return ctx.DB.get(true, "messages")
    }

  }
}


type ChatService = {
  getName:(id:IdString)=>Writable<string>,
  identity:IdString,
}

let chatService : null | ChatService = null;


export const getChatService = async (conn:ServerConnection)=>{
  if (!chatService) {
    chatService = await doGetChatSerice(conn)
  }
  return chatService
  
}



const doGetChatSerice = (conn:ServerConnection) :Promise<ChatService>=> {

  return new Promise((res, rej)=>{
  conn.handle(msgApp).then(async ({call, users, get})=>{

    let nametable = new Map<IdString, Writable<string>> ()
    const getName = (id:IdString) =>{
      if (!nametable.has (id)){
        let wr = new Writable<string> ("loading name ...")
        nametable.set(id, wr)
        call(id, msgApp.api.getname).then(n=>{
          console.log("uname:", n)
          wr.set(n)
        })
      }
      return nametable.get(id)
    }

    const myname = getName(conn.identity)


    myname.subscribe(n=>{
      console.log("myname:", n)
      if (!n){
        let inp = input()
        inp.placeholder = "username"
        let pn = popup(div(
          h2("Enter your username"),
          inp,
          button("set", {onclick:()=>{
            call(conn.identity, msgApp.api.setname, inp.value).then(()=>{
              myname.set(inp.value)
              pn.remove()
            })
            .catch(e=>{
              console.error(e)
            })
          }})
        ))
      }
    })

    res({
      getName,
      identity:conn.identity
    })

  })})

}




export const chatView : PageComponent = (conn:ServerConnection) => {


  let adis = p()

  let el = div()

  getChatService(conn).then(chatService=>{
    let nameinp = input()
    el.appendChild(div(
      p("your name: ", chatService.getName(conn.identity), )
    ))

  })

  


  

  return el
}
