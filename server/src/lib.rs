

#![allow(unused)]

use std::{cell::RefCell, rc::Rc};

use spacetimedb::{reducer, sats::u256, table, Identity, RangedIndex, ReducerContext, SpacetimeType, Table};
use sha2::{Sha256, Digest};



// use rubox::{ast::{mk_fn, mk_native_fn, Value}, *};
use im::HashMap;
mod tests;
mod lang;

use lang::parser::*;

use crate::lang::{ast::{EnvData, Value}, readback::read_back, runtime::{do_eval, env_extend}};

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
  #[primary_key]
  key:u256,
  owner:Identity,
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




#[spacetimedb::reducer]
pub fn call_lambda(ctx: &ReducerContext, other:Identity, app:u256, lam:u256, arg:String)->Result<(), String>{

  let by_host_and_app: RangedIndex<_, (Identity, u256), _> = ctx.db.host().hostkey();
  by_host_and_app.filter((other, app)).next().ok_or("app not installed on other")?;
  by_host_and_app.filter((ctx.sender, app)).next().ok_or("app not installed on self")?;

  let lam = ctx.db.lambda().id().find(lam).ok_or("lambda not found")?;
  let app = ctx.db.app().id().find(app).ok_or("app not found")?;

  let fullcode = format!("({})({})", lam.code, arg);


  let ast = parse(&fullcode).map_err(|e| e.to_string())?;

  let res = do_eval(&ast,
    &Rc::new(EnvData{
      bindings: RefCell::new(HashMap::from_iter(vec![
        ("DBSet".into(), Rc::new(Value::NativeFn("DBSet".into()))),
        ("DBGet".into(), Rc::new(Value::NativeFn("DBGet".into()))),
      ])),
      parent: None,
    }),
    |fname: &str, args: Vec<Value>|{

    let _innerres: Result<Value, String> = 
    match (fname, args.as_slice()){
      ("DBSet", [Value::Boolean(forme), Value::String(key), Value::String(content)]) => {
        if *forme {
          ctx.db.store().try_insert(Store{key:hash_string(&key), owner:ctx.sender, content:"content".into()})?;
        };
        Ok(Value::Null)
      },
      ("DBGet", [Value::String(key)]) => {
        let store = ctx.db.store().key().find(hash_string(&key)).ok_or("key not found");
        match store {
          Ok(store) => Ok(Value::String(store.content)),
          Err(e) => Ok(Value::String("".into())),
        }
      },

      (_, _) => return Err("function not found".to_string())
    };
    
    Ok(Value::Int(22))
  })?;


  let key = hash_fun_args(ctx.sender, other, app.id, lam.id, &arg);

  log::info!("inserting {} for {}", key, ctx.sender.to_u256());

  ctx.db.store().try_insert(Store{
    key:key,
    owner:ctx.sender,
    content:read_back(&res)})?;

  Ok(())

}
