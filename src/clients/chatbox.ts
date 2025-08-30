
import { button, div, h2, input, p, popup } from "../html";
import { PageComponent } from "../main";
import { ServerApp, DefaultContext, IdString, ServerConnection, Serial } from "../userspace";
import {  Stored, Writable } from "../store";




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


export class ChatService {
  constructor(
    public server : ServerConnection<ChatCtx>
  ){


    console.log("ChatService", this.server.identity)

    this.server.users().then(us=>{
      console.log("users", us)
    })

    this.setName("meeeee").then(()=>{

      this.server.call(this.server.identity, msgApp.api.getname).then(n=>{
        console.log("getName done", n)
      })

    })
  }


  getName(id:IdString):Writable<string> {
    return new Writable<string>(id)
  }

  async setName(name:string):Promise<void> {
    await this.server.call(this.server.identity, msgApp.api.setname, name)
  }


  static async connect(url:string):Promise<ChatService> {
    let server = await ServerConnection.connect(url,
      "rubox",
      new Stored<string>("rubox-token-"+url, ''), msgApp,
      (note:Serial)=>{
        console.log("notify", note)
      });

    return new ChatService(server)
  }

}
