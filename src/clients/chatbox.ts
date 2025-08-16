


import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { button, div, h2, p } from "../html";
import { PageComponent } from "../main";
import { Box, DBTable, DefaultContext, ServerConnection } from "../userspace";




type msgCtx = {

  a:number
}


const msgBox : Box<msgCtx> = {
  getCtx: (c:DefaultContext) => {
    return {
      a: 1
    }
  },
  api: {

    geta: (ctx, arg)=>{
      let x = ctx.DB.set(true, "a", "moop");
      return ctx.DB.get(true, "a")
    }
  }
}



export const chatView : PageComponent = (conn:ServerConnection) => {


  let adis = p()
  let fire = button("fire")

  conn.handle(msgBox).then(async app=>{
    fire.onclick = async () => {
      adis.textContent = "loading..."
      adis.textContent = await app(conn.identity, msgBox.api.geta)
    }
  })

  return div(
    h2("this chat"),
    fire,
    adis,


  )

}


