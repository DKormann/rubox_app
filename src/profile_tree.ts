//

import { Identity } from "@clockworklabs/spacetimedb-sdk"
import { DbConnection } from "./module_bindings"
import { CachedStore, Stored } from "./store"



type TObject = {[keyof : string]: string}



let dbToken = new Stored


let connectServer = async (url:string) => {

  let remoteItems = new CachedStore()
  DbConnection.builder()

  .onConnect((conn, Identity, token))

  .build()
  





  return res

  
}



connectServer('e').e



//