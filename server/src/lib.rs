

#![allow(unused)]

use std::{cell::RefCell, rc::Rc};

use spacetimedb::{reducer, sats::u256, table, Identity, RangedIndex, ReducerContext, SpacetimeType, Table};
use sha2::{Sha256, Digest};



// use rubox::{ast::{mk_fn, mk_native_fn, Value}, *};
use im::HashMap;
mod tests;
mod lang;

use lang::parser::*;

use crate::lang::{ast::{mk_object, EnvData, Expr, Value}, readback::{self, read_back}, runtime::{do_eval, env_extend, eval}};

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
  app: u256,
}

#[table(name = host, public, index(name = hostkey, btree(columns = [host, app])))]
pub struct Host{
  host:Identity,
  app:u256,
}


#[derive(Clone)]
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


pub fn hash_key(owner:Identity, app:u256, key:&str)->u256{
  let mut hash = Sha256::new();
  hash.update(owner.to_be_byte_array());
  hash.update(app.to_be_bytes());
  hash.update(key);
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

  let dbctxex = mk_object(vec![("DB".into(), mk_object(vec![
    ("set".into(), (Value::NativeFn("DBSet".into())).into()),
    ("get".into(), (Value::NativeFn("DBGet".into())).into()),
  ]))]);

  let by_host_and_app: RangedIndex<_, (Identity, u256), _> = ctx.db.host().hostkey();
  by_host_and_app.filter((other, app)).next().ok_or("app not installed on other")?;
  by_host_and_app.filter((ctx.sender, app)).next().ok_or("app not installed on self")?;

  let lam = ctx.db.lambda().id().find(lam).ok_or("lambda not found")?;
  let app = ctx.db.app().id().find(app).ok_or("app not found")?;


  let lamex = parse(&lam.code).map_err(|e| e.to_string())?;
  let argex = parse(&arg).map_err(|e| e.to_string())?;

  let finast = Expr::Call(Box::new(lamex), vec![dbctxex, argex]);


  let res = do_eval(&finast,
    &Rc::new(EnvData{bindings: RefCell::new(HashMap::new()), parent: None,}),
    |fname: &str, args: Vec<Value>|{

    match (fname, args.as_slice()){
      ("DBSet", [Value::Boolean(from_me), Value::String(key), content]) => {
        let content = read_back(content);
        let owner = if *from_me {ctx.sender} else {other};
        let key = hash_key(owner, app.id, &key);
        log::info!("setting {}, {}, {}", owner, app.id, &key);
        let insres = ctx.db.store().try_insert(Store{key, owner:ctx.sender, content:content.clone()});
        if insres.is_err(){
          ctx.db.store().key().update(Store{key, owner:ctx.sender, content:content.clone()});
        };
        Ok(Value::Null)
      },
      ("DBGet", [Value::Boolean(from_me), Value::String(key)]) => {
        let owner = if *from_me {ctx.sender} else {other};
        let key = hash_key(owner, app.id, &key);

        let val: Value = match ctx.db.store().key().find(key){
          Some(store) => {
            let ast = parse(&store.content).map_err(|e| e.to_string())?;
            let res = eval(&ast)?;
            (*res).clone()
          },
          None => Value::Null,
        };

        Ok(val)
      },

      (_, _) => return Err("function not found".to_string())
    }
  })?;


  let key = hash_fun_args(ctx.sender, other, app.id, lam.id, &arg);

  log::info!("inserting result {} for {}", key, ctx.sender.to_u256());


  let item  = Store{
    key:key,
    owner:ctx.sender,
    content:read_back(&res)
  };

  match ctx.db.store().try_insert(item.clone()){
    Ok(_) => Ok(()),
    Err(e) => {
      ctx.db.store().key().update(item);
      Ok(())
    }
  }


}
