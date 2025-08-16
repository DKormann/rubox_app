import { button, div, h2, input, p } from "../html";
import { PageComponent } from "../main";
import { Box, DefaultContext, ServerConnection } from "../userspace";


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

    setname:(ctx, arg)=>{
      ctx.DB.set(true, "name", arg)
    },

    getname:(ctx,arg)=>{
      return ctx.DB.get(true, "name")
    },

    geta:(ctx, arg)=>{
      let v = ["fv'vf", 22];
      let _ = ctx.DB.set(true, "a", v);
      return ctx.DB.get(true, "a")
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
      }))
  
    ))
  })

  return el
}
