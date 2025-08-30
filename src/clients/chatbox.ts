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

    getname:(ctx,arge)=>{
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



console.log("FUN",msgApp.api.getMessages.toString())


export const chatView : PageComponent = (conn:ServerConnection) => {

  let nametable = new Map<IdString, Writable<string>>()

  let adis = p()

  let el = div()
  
  
  conn.handle(msgApp).then(async ({call, users, subscribe})=>{
    console.log("handle", msgApp)
    async function getName(id:IdString){
      let cached = nametable.get(id)
      if (cached) return cached
      let writable = new Writable<string>("")

      call(id, msgApp.api.getname, id).then(name=>writable.set(name))
      nametable.set(id, writable)
      return writable
    }


    let msgs = new Writable<Msg[]>([])
    let msgDisplay = new Writable<HTMLElement>(div());
    let other = new Stored<IdString>("other", conn.identity)


    function displayMsgs(){
      msgDisplay.set(div(

        msgs.get().filter(msg=>(msg.receiver == other.get() && msg.sender == conn.identity) || ( msg.sender == other.get() && msg.receiver == conn.identity))
        .map(msg=>p(getName(msg.sender), " : ",msg.message)),
        {style:{"max-width": "20em", "margin":"auto"}}
      ))
    }


    call(conn.identity, msgApp.api.getMessages).then(m=>msgs.set(m??[]))
    msgs.subscribe(e=>displayMsgs())
    other.subscribeLater(no=>displayMsgs())
    subscribe("messages", (c:Msg[])=>{
      msgs.set(c ?? [])}
    )


    let myname = input();
    await getName(conn.identity).then(name=>name.subscribe(n=>myname.value = n))

    let msginput = input()
    let send = button("send")
    send.onclick = async () => {
      await call(other.get(), msgApp.api.sendMessage, msginput.value)
      msginput.value = ""
    }

    let othername = new Writable<string>("")
    other.subscribe(id=>{
      getName(id).then(name=>name.subscribe(n=>othername.set(n)))
    })
  
    el.appendChild(div(
      h2("chat"),
      adis,

      p("my name:",myname, button("update", {
        onclick: () => {
          call(conn.identity, msgApp.api.setname, myname.value).then(()=>{
            getName(conn.identity).then(name=>name.set(myname.value))
          })
        }
      })),

      button("chat with: ", othername, {onclick: () => {
        let el = popup(div(
          h2("chat with"),
          users().then(users=>users.map(user=>p(
            getName(user),
            {onclick:()=>{
              other.set(user)
              el.remove()
            }}
          )))
        ))
      }}),

      msgDisplay,

      p("send message:",msginput, send),

    ))
  })

  return el
}
