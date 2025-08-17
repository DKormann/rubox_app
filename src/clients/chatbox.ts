import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { button, div, h2, input, p } from "../html";
import { PageComponent } from "../main";
import { Box, DefaultContext, ServerConnection } from "../userspace";


type msgCtx = {
  a:number,
  pushMsg: (msg:string)=>void
}




type Msg = {
  sender:Identity

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

    getMessages(ctx){
      return ctx.DB.get(true, "messages")
    }

  }
}

export const chatView : PageComponent = (conn:ServerConnection) => {

  let adis = p()
  let fire = button("fire")
  let el = div()

  console.log(JSON.stringify(conn.identity))

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

    let msginput = input()
    let send = button("send")
    send.onclick = async () => {
      console.log(await call(conn.identity, msgBox.api.sendMessage, msginput.value))
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

      p("send message:",msginput, send),


  
    ))
  })

  return el
}
