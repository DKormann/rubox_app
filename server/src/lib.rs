use spacetimedb::{reducer, sats::u256, table, Identity, RangedIndex, ReducerContext, SpacetimeType, Table};
use sha2::{Sha256, Digest};
use rubox::{ast::Value, *};




#[table(name = lambda, public)]
pub struct Lambda{
  #[primary_key]
  id: u256,
  code: String,
}


#[table(name = app, public)]
pub struct App{
  #[primary_key]
  id:u256,
  setup:String,
}


#[derive(SpacetimeType)]
pub struct HostKey{
  host: Identity,
  app:u256,
}

#[table(name = host, public, index(name = hostkey, btree(columns = [host, app])))]
pub struct Host{
  host:Identity,
  app:u256,
}


#[table(name = store, public)]
pub struct Store{
  owner: Identity,
  app:u256,
  lam:u256,
  arg:u256,
  content:String,
}


#[derive(SpacetimeType)]
pub struct AppData{
  setup:String,
  functions:Vec<String>,
}


#[reducer]
pub fn publish(ctx: &ReducerContext, app:AppData){


  let funhashes:Vec<u256> = app.functions.iter().map(|f| {
    let hash = hash_string(f);
    ctx.db.lambda().insert(Lambda{id:hash, code:f.clone()});
    hash
  }).collect();

  let apphash = hash_app(&app.setup, funhashes);
  ctx.db.app().insert(App{id:apphash, setup:app.setup});
}


pub fn hash_string(s:&str)->u256{
  let mut hash = Sha256::new();
  hash.update(s);
  return u256::from_be_bytes(*hash.finalize().as_ref())
}

pub fn hash_app(setup:&str, functions:Vec<u256>)->u256{
  let mut hash = Sha256::new();
  hash.update(setup);
  functions.iter().for_each(|f| hash.update(f.to_be_bytes()));
  return u256::from_be_bytes(*hash.finalize().as_ref())
}



#[reducer]
pub fn sethost(ctx: &ReducerContext, app:u256, value:bool){
  if value {
    ctx.db.host().insert(Host{host:ctx.sender, app});
  } else {
    ctx.db.host().delete(Host{host:ctx.sender, app});
  }
}






#[spacetimedb::reducer]
pub fn call_lambda(ctx: &ReducerContext, other:Identity, app:u256, lam:u256, arg:String)->Result<(), String>{

  let by_host_and_app: RangedIndex<_, (Identity, u256), _> = ctx.db.host().hostkey();
  by_host_and_app.filter((other, app)).next().ok_or("app not installed on other")?;
  by_host_and_app.filter((ctx.sender, app)).next().ok_or("app not installed on self")?;


  // we do not need to check app and lambda here.
  let lam = ctx.db.lambda().id().find(lam).ok_or("lambda not found")?;
  let app = ctx.db.app().id().find(app).ok_or("app not found")?;

  let res = runcode(&lam.code).map_err(|e| e.to_string())?;

  ctx.db.store().insert(Store{owner:ctx.sender, app:app.id, lam:lam.id, arg:hash_string(&arg), content:res});

  Ok(())


}

