import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { button, div, h2, input, p } from "../html";
import { PageComponent } from "../main";
import { Box, DefaultContext, IdString, ServerConnection } from "../userspace";
import { Stored, Writable } from "../store";


type msgCtx = {
  a:number,
  pushMsg: (msg:string)=>void
}




type Msg = {
  sender:IdString,
  message:string
}

const msgBox : Box<msgCtx> = {
  getCtx: (c:DefaultContext) => {
    return {
      a: 1,

      pushMsg: (msg:string)=>{
        c.DB.set(false, "messages", [...c.DB.get<Msg[]> (false, "messages") ?? [], {sender:c.self, message:msg}])
      }
    }
  },
  api: {

    setname:(ctx, arg)=>{
      ctx.DB.set(false, "name", arg)
    },

    getname:(ctx,arg)=>{
      return ctx.DB.get(true, "name")
    },

    sendMessage:(ctx,arg:string)=>{
      ctx.pushMsg(arg)
    },

    getMessages:(ctx,arg)=>{
      return ctx.DB.get(true, "messages")
    }

  }
}

export const chatView : PageComponent = (conn:ServerConnection) => {

  let adis = p()
  let fire = button("fire")
  let el = div()


  conn.handle(msgBox).then(async ({call, users})=>{
    fire.onclick = async () => {
      adis.textContent = "loading..."
      adis.textContent = await call(conn.identity, msgBox.api.geta)
    }
    users().then(users=>{
      console.log("users", users)
    }).catch(console.error)

    const getmyname = () =>call(conn.identity, msgBox.api.getname).then(name=>{
      myname.value = name
    })

    getmyname()

    let myname = input()

    let msgDisplay = new Writable<HTMLElement>(div());

    let msgs = new Stored<Msg[]>("msgs", [])

    msgs.subscribe((msgs)=>{
      msgDisplay.set(div(
        msgs.map(msg=>p(
          msg.sender.slice(0,10),
          " : ",
          msg.message
        )),
        {style:{
          "max-width": "20em",
          "margin": "auto",
          // "text-align": "left",
        }}
      ))
    })

    let msginput = input()
    let send = button("send")
    send.onclick = async () => {
      console.log(await call(conn.identity, msgBox.api.sendMessage, msginput.value))

      call(conn.identity, msgBox.api.getMessages).then((msg:Msg[])=>{

        msgs.set(msg)
      })



    }
  
    el.appendChild(div(
      h2("this chat"),
      fire,
      adis,

      p("my name:",myname, button("update", {
        onclick: () => {

          call(conn.identity, msgBox.api.setname, myname.value).then(()=>{
            getmyname()
          })
        }
      })),

      msgDisplay,

      p("send message:",msginput, send),


  
    ))
  })

  return el
}
