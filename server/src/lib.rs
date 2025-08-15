use std::rc::Rc;

use spacetimedb::{reducer, sats::u256, table, Identity, RangedIndex, ReducerContext, SpacetimeType, Table};
use sha2::{Sha256, Digest};
use rubox::{ast::{mk_fn, mk_native_fn, Value}, *};
use im::HashMap;



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
  owner:Identity,
  key:u256,
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



pub fn hash_fun_args(owner:Identity, other:Identity, app:u256, lam:u256, arg:&str)->u256{
  let mut hash = Sha256::new();
  hash.update(owner.to_be_byte_array());
  hash.update(other.to_be_byte_array());
  hash.update(app.to_be_bytes());
  hash.update(lam.to_be_bytes());
  hash.update(arg);
  return u256::from_be_bytes(*hash.finalize().as_ref())
}



pub fn store_set(ctx:&ReducerContext,owner:Identity, key:String, content:String){
  let keycode = hash_string(&key);
  ctx.db.store().insert(Store{owner, key:keycode, content});
}

#[spacetimedb::reducer]
pub fn call_lambda(ctx: &ReducerContext, other:Identity, app:u256, lam:u256, arg:String)->Result<(), String>{

  let by_host_and_app: RangedIndex<_, (Identity, u256), _> = ctx.db.host().hostkey();
  by_host_and_app.filter((other, app)).next().ok_or("app not installed on other")?;
  by_host_and_app.filter((ctx.sender, app)).next().ok_or("app not installed on self")?;

  let lam = ctx.db.lambda().id().find(lam).ok_or("lambda not found")?;
  let app = ctx.db.app().id().find(app).ok_or("app not found")?;

  let fullcode = format!("({})({})", lam.code, arg);


  store_set(ctx,ctx.sender.clone(),"test".to_string(),"test".to_string());

  let store = ctx.db.store().clone();


  let native_set = Rc::new(Value::NativeFn(Rc::new(|args|{
    if let [Value::Boolean(forme), Value::String(key), Value::String(content)] = args {
      if *forme {

        store.insert(Store{owner:ctx.sender.clone(), key:hash_string(&key), content:"content".into()});
      };
    };
    Ok(Value::Int(22))
  })));

  let std_ctx = HashMap::from(
    vec![
      ("other".to_string(), Rc::new(Value::String(other.to_string()))),

      ("DBSet".to_string(), (native_set)),
    ]
  );

  let res = runcode_ctx(&fullcode,std_ctx).map_err(|e| e.to_string())?;



  let key = hash_fun_args(ctx.sender, other, app.id, lam.id, &arg);

  ctx.db.store().insert(Store{owner:ctx.sender, key, content:res});

  Ok(())

}

