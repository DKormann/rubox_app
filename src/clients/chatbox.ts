
import { button, div, h2, input, p, popup } from "../html";
import { PageComponent } from "../main";
import { ServerApp, DefaultContext, IdString, ServerConnection, Serial } from "../userspace";
import {  Stored, Writable } from "../store";



type MsgNotification = ["new message", number]

type ChatCtx = {
  pushMsg: (msg:string)=>void
  // sendNotify: ()=>void
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
        let prev = c.DB.get<Msg[]> (true, "messages");
        c.DB.set(true, "messages", [...prev ?? [], d])
        c.notify(["new message", prev.length ?? 0])

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
  constructor(
    public server : ServerConnection<ChatCtx>
  ){
  }

  render(){

    const nametag = input();

    this.getName(this.server.identity).then(n=>n.subscribe(n=>{nametag.value = n}))

    const setname = ()=>{

      const name = nametag.value
      this.setName(name).then(()=>{
        popup("name updated ", name)
        this.server.call(this.server.identity, msgApp.api.setname, name).then(()=>{
          this.getName(this.server.identity).then(n=>n.set(name))
        })
      })  
    }

    nametag.addEventListener("keydown", (e:KeyboardEvent)=>{
      if (e.key === "Enter"){
        setname()
      }
    })

    let active_partner = new Stored<IdString>("chat_active_partner", this.server.identity)


    this.server.call(this.server.identity, msgApp.api.getMessages).then(m=>(m as Msg[])).then(m=>this.msgs.set(m))

    let chatinput = input({placeholder: "enter message"})

    chatinput.addEventListener("keydown", (e:KeyboardEvent)=>{
      if (e.key === "Enter"){
        this.server.call(active_partner.get(), msgApp.api.sendMessage, chatinput.value)
        .then(()=>{
          this.refreshMsgs()
          chatinput.value = ""
        })
      }
    })


    return div(
      h2("chatbox"),

      p("my name:", nametag),

      p("active users:"),
      this.server.users().then(us=>us.map(u=>
        p(this.getName(u), " ", button("message", {onclick: ()=>{active_partner.set(u)}}))
      )),

      p("chatting with:", active_partner.map(p=> this.getName(p))),
      p("messages:"),

      this.msgs.map(m=>
        active_partner.map(partner=>
          m.filter(m=>(m.receiver == partner && m.sender == this.server.identity) || (m.sender == partner && m.receiver == this.server.identity))
          .map(m=>p(this.getName(m.sender), " : ", m.message))
        )
      ),
      chatinput,

      
    )
  }

  refreshMsgs(){
    this.server.call(this.server.identity, msgApp.api.getMessages).then(m=>(m as Msg[])).then(m=>this.msgs.set(m))
  }

  async getName(id:IdString):Promise<Writable<string>> {
    if (!this.nameCache.has(id)) {
      const n = await this.server.call(id, msgApp.api.getname) as string;
      this.nameCache.set(id, new Writable<string>(n))
    }
    return this.nameCache.get(id)!
  }

  async setName(name:string):Promise<void> {
    await this.server.call(this.server.identity, msgApp.api.setname, name)
  }


  static async connect(url:string):Promise<ChatService> {
    let server = await ServerConnection.connect(url,
      "rubox",
      new Stored<string>("rubox-token-"+url, ''), msgApp,
      (note:MsgNotification)=>{
        console.log("notify", note)
        service.refreshMsgs()
      })
    let service = new ChatService(server)

    return service
  }

}



