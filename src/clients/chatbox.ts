
import { button, div, h2, input, p, popup } from "../html";
import { PageComponent } from "../main";
import { ServerApp, DefaultContext, IdString, ServerConnection, Serial, AppHandle, WSSURL } from "../userspace";
import {  Stored, Writable } from "../store";
import { Store } from "../module_bindings";



type MsgNotification = ["new message", number]

type ChatCtx = {
  pushMsg: (msg:string)=>void
}

type Msg = {
  sender:IdString,
  receiver:IdString,
  message:string
}


export const msgApp : ServerApp<ChatCtx> = {
  name: "chatbox",
  loadApp: (c:DefaultContext) => {
    return {
      pushMsg: (msg:string)=>{
        let d:Msg = {
          sender: c.self,
          receiver: c.other,
          message: msg
        };
        let t = c.DB.set(false, "messages", [...c.DB.get<Msg[]> (false, "messages") ?? [], d]);
        if (c.self == c.other) {
          return null
        }
        let prev = c.DB.get<Msg[]> (true, "messages");
        c.DB.set(true, "messages", [...prev ?? [], d])
        c.notify(["new message", prev ? prev.length : 0])
      },
    }
  },
  api: {

    setname:(ctx, arg)=>{
      ctx.DB.set(true, "name", arg)
    },

    getname:(ctx,arg)=>{
      return ctx.DB.get(false, "name") || "anonym"
    },

    sendMessage:(ctx,arg:string)=>{
      ctx.pushMsg(arg)
    },

    getMessages:(ctx,arg)=>{
      return ctx.DB.get(true, "messages") || []
    }

  }
}


export class ChatService {
  nameCache = new Map<IdString, Writable<string>>()
  msgs = new Writable([] as Msg[])
  active_partner: Writable<IdString>
  conn: AppHandle

  constructor(server:ServerConnection){


    this.conn = new AppHandle(server, msgApp, (note:MsgNotification)=>this.refreshMsgs())
    this.active_partner = new Stored<IdString>( `chat_partner_${this.conn.app}`, this.conn.identity)



  }

  render(){

    let myname = this.getName(this.conn.identity)

    myname.get().then(n=>{
      myname.subscribeLater(n=>{
        this.conn.call(this.conn.identity, msgApp.api.setname, n)
        .then(()=>popup("name updated: ", n))
      })
    })

    this.refreshMsgs()

    return div(
      h2("chatbox"),
      p("my name:", input(myname)),

      p("active users:"),
      this.conn.users().then(us=>us.map(u=>
        p(this.getName(u), " ", button("message", {onclick: ()=>{this.active_partner.set(u)}}))
      )),

      p("chatting with:",this.active_partner.map(p=> this.getName(p))),
      p("messages:"),

      this.msgs.map(m=>
        this.active_partner.map(partner=>
          m.filter(m=>(m.receiver == partner && m.sender == this.conn.identity) || (m.sender == partner && m.receiver == this.conn.identity))
          .map(m=>p(this.getName(m.sender), " : ", m.message))
        )
      ),

      input({
        placeholder: "enter message",
        onkeydown:(e)=>{
          if (e.key === "Enter"){
            let inp = e.target as HTMLInputElement
            this.sendMessage(inp.value)
            inp.value = ""
          }
        }
      }),
    )
  }

  async sendMessage(message:string){
    this.conn.call(await this.active_partner.get(), msgApp.api.sendMessage, message)
    .then(()=>{
      this.refreshMsgs()
    })
  }

  refreshMsgs(){
    this.conn.call(this.conn.identity, msgApp.api.getMessages).then(m=>(m as Msg[])).then(m=>this.msgs.set(m))
  }

  getName(id:IdString):Writable<string> {
    if (!this.nameCache.has(id)) {
      const nm = this.conn.call(id, msgApp.api.getname) as Promise<string>;
      let res = new Writable<string>(nm)
      this.nameCache.set(id, res)
    }
    return this.nameCache.get(id)!
  }

  async setName(name:string):Promise<void> {
    await this.conn.call(this.conn.identity, msgApp.api.setname, name);
  }

  // static async connect(url:WSSURL):Promise<ChatService> {
  //   let conn = await AppHandle.connect(
  //     url, msgApp,
  //     (note:MsgNotification)=>service.refreshMsgs()
  //   )

  //   let service = new ChatService(conn)
  //   return service
  // }

}



