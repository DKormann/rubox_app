
import { button, div, h2, input, p, popup } from "../html";
import { PageComponent } from "../main";
import { ServerApp, DefaultContext, IdString, ServerConnection, Serial, AppHandle, WSSURL } from "../userspace";
import {  Stored, Writable } from "../store";
import { Store } from "../module_bindings";



type MsgNotification = ["new message", number]

type ChatCtx = {
  pushMsg: (target:IdString, msg:string)=>void
}

type Msg = {
  sender:IdString,
  receiver:IdString,
  message:string
}


export const msgApp  = {
  name: "chatbox",
  loadApp: (c:DefaultContext) => {
    return {
      pushMsg: (target:IdString, msg:string)=>{
        let d:Msg = {
          sender: c.self,
          receiver: target,
          message: msg
        };
        let t = c.DB.set(target, "messages", [...c.DB.get<Msg[]> (target, "messages") ?? [], d]);
        if (c.self == target) {
          return null
        }
        let prev = c.DB.get<Msg[]> (c.self, "messages");
        c.DB.set(c.self, "messages", [...prev ?? [], d])
        c.notify(target, ["new message", prev ? prev.length : 0])
      },
    }
  },
  api: {

    setname:(ctx, arg)=>{
      ctx.DB.set(ctx.self, "name", arg)
    },

    getname:(ctx,target:IdString)=>{
      return ctx.DB.get(target, "name") || "anonym"
    },

    sendMessage:(ctx, arg:{target:IdString, message:string})=>{
      ctx.pushMsg( arg.target, arg.message)
    },

    getMessages:(ctx,arg:null)=>{
      return ctx.DB.get(ctx.self, "messages") || []
    },
  }
} as ServerApp<ChatCtx>



export class ChatService {
  nameCache = new Map<IdString, Writable<string>>()
  msgs = new Writable([] as Msg[])
  active_partner: Writable<IdString>
  conn: AppHandle

  static instances: ChatService[] = []


  constructor(server:ServerConnection){    

    let instance = ChatService.instances.find(i=>i.conn.server == server)
    if (instance) return instance;

    console.log("creating chat service")

    this.conn = new AppHandle(server, msgApp, (note:MsgNotification)=>this.refreshMsgs())
    this.active_partner = new Stored<IdString>( `chat_partner_${this.conn.app}`, this.conn.identity)
  }

  render(){

    let myname = this.getName(this.conn.identity)

    myname.get().then(n=>{
      myname.subscribeLater(n=>{
        this.conn.call(msgApp.api.setname, n)
        .then(()=>popup("name updated: ", n))
      })
    })

    this.refreshMsgs()

    let nameview = input(myname)
    

    return div(
      h2("chatbox"),
      p("my name:", nameview, button("update", {onclick: ()=>{myname.set(nameview.value)}})),

      p("active users:"),
      this.conn.users().then(us=>us.map(u=>
        p(this.getName(u), " ", button("message", {onclick: ()=>{this.active_partner.set(u)}}))
      )),

      p("chatting with:",this.active_partner.map(p=> this.getName(p))),
      p("messages:"),


      this.active_partner.map(partner=>this.filterMsgs(partner).map(m=>m.map(m=>p(this.getName(m.sender), " : ", m.message)))),

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
    await this.sendMessageTo(message, await this.active_partner.get())
  }

  async sendMessageTo(message:string, target:IdString){
    await this.conn.call(msgApp.api.sendMessage, {target, message})
    .then(()=>{this.refreshMsgs()})
  }

  filterMsgs(partner:IdString){

    return this.msgs.map(m=>m.filter(m=>(m.receiver == partner && m.sender == this.conn.identity) || (m.sender == partner && m.receiver == this.conn.identity)))
    .map(m=>{
      console.log("filtering messages for", partner)
      console.log("messages", m)
      return m
    })
  }

  async refreshMsgs(){
    await this.conn.call(msgApp.api.getMessages).then(m=>(m as Msg[])).then(m=>this.msgs.set(m))
  }

  getName(id:IdString):Writable<string> {
    if (!this.nameCache.has(id)) {
      const nm = this.conn.call(msgApp.api.getname, id) as Promise<string>;
      let res = new Writable<string>(nm
        .catch(e=>{
          return "anonym"
        })
      )
      this.nameCache.set(id, res)
    }
    return this.nameCache.get(id)!
  }

  async setName(name:string):Promise<void> {
    await this.conn.call(msgApp.api.setname, name);
  }

}



