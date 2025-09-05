




const msgApp = {
  setup:(ctx:DefaultContext)=>{
  }
  api:{
    setname:(ctx, name:string)=>{
      ctx.storage.set("true", "name", name)
    }
  }
}



async function setup(){
  let server = await connectServer("ws://localhost:8080")
  let app = await server.loadApp<DefaultContext>(msgApp)

  let name = await app.get("name")

}


Date.now