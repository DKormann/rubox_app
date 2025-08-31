
import { button, div, h2, input, p, popup } from "../html";
import { PageComponent } from "../main";
import { ServerApp, DefaultContext, IdString, ServerConnection, Serial } from "../userspace";
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
  active_partner: Writable<IdString>

  constructor(
    public server : ServerConnection<ChatCtx>
  ){
    this.active_partner = new Stored<IdString>( `chat_partner_${this.server.identity}`, this.server.identity)
  }  

  render(){

    const nametag = input();

    this.getName(this.server.identity).then(n=>{
      n.subscribe(n=>{nametag.value = n})
      nametag.onkeydown = (e:KeyboardEvent)=>{
        if (e.key === "Enter"){
          this.setName(nametag.value).then(()=>{
            popup("name updated ", nametag.value)
            this.getName(this.server.identity).then(n=>n.set(nametag.value))
          })
        }
      }
    });


    return div(
      h2("chatbox"),

      p("my name:", nametag),

      p("active users:"),
      this.server.users().then(us=>us.map(u=>
        p(this.getName(u), " ", button("message", {onclick: ()=>{this.active_partner.set(u)}}))
      )),

      p("chatting with:",this.active_partner.map(p=> this.getName(p))),
      p("messages:"),

      this.msgs.map(m=>
        this.active_partner.map(partner=>
          m.filter(m=>(m.receiver == partner && m.sender == this.server.identity) || (m.sender == partner && m.receiver == this.server.identity))
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

  sendMessage(message:string){
    this.server.call(this.active_partner.get(), msgApp.api.sendMessage, message)
    .then(()=>{
      this.refreshMsgs()
    })
  }

  refreshMsgs(){
    this.server.call(this.server.identity, msgApp.api.getMessages).then(m=>(m as Msg[])).then(m=>this.msgs.set(m))
  }

  async getName(id:IdString):Promise<Writable<string>> {
    if (!this.nameCache.has(id)) {
      const n = await this.server.call(id, msgApp.api.getname) as string;
      this.nameCache.set(id, new Writable<string>(n))
    }
    
    let res = this.nameCache.get(id)!;
    console.log("getName", id, res.get())
    return res
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



