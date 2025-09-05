

#![allow(unused)]

use std::{cell::RefCell, error::Error, rc::Rc};

use spacetimedb::{reducer, sats::u256, spacetimedb_lib::db, table, Identity, RangedIndex, ReducerContext, SpacetimeType, Table};
use sha2::{Sha256, Digest};



// use rubox::{ast::{mk_fn, mk_native_fn, Value}, *};
use im::HashMap;
// mod tests;
mod test_parse_expr;
mod test_eval_expr;

mod lang;
use lang::parser::*;
use crate::lang::{ast::{mk_call, mk_object, mk_string, EnvData, Expr, ObjElem, Value}, readback::{self, read_back}, runtime::{do_eval, env_extend, eval, eval_native}};


#[table(name = host, public, index(name = hostkey, btree(columns = [host, app])))]
pub struct Host{
  host:Identity,
  app:u256,
}


#[table(name = app)]
pub struct App{
  #[primary_key]
  id:u256,
  setup:String,
}

#[table(name = lambda)]
pub struct Lambda{
  #[primary_key]
  id: u256,
  code: String,
}


#[derive(Clone)]
#[table(name = store, index(name = storekey, btree(columns = [key, owner])))]
pub struct Store{
  key:u256,
  owner:Identity,
  content:String,
}

#[derive(Clone, SpacetimeType)]
pub enum LamResult{
  Ok(String),
  Err(String),
}

#[derive(Clone)]
#[table(name = returns, public)]
pub struct Return{
  #[primary_key]
  owner:Identity,
  app:u256,
  id: u32,
  logs:Vec<String>,
  result:LamResult,
}

#[derive(Clone)]
#[table(name = notification, public)]
pub struct Notification{
  #[primary_key]
  target:Identity,
  app:u256,
  sender:Identity,
  arg:String,
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


pub fn hash_key(app:u256, key:&str)->u256{
  let mut hash = Sha256::new();
  hash.update(app.to_be_bytes());
  hash.update(key);
  return u256::from_be_bytes(*hash.finalize().as_ref())
}


fn identity_string(id:Identity)->String{
  format!("id{}", id.to_hex())
}

pub fn is_hosting(ctx: &ReducerContext, app:u256, other:Identity)->bool{
  ctx.db.host().hostkey().filter((other, app)).next().is_some()
}

#[spacetimedb::reducer]
pub fn set_host(ctx: &ReducerContext, app:u256, value:bool){
  if value{
    ctx.db.host().insert(Host{host:ctx.sender, app});
  }else{
    ctx.db.host().delete(Host{host:ctx.sender, app});
  }
}


pub fn identity_from_string(s:&str)->Identity{
  if s.starts_with("id"){
    let (_, s) = s.split_at(2);
    return Identity::from_hex(s).unwrap();
  }
  Identity::from_hex(s).unwrap()
}

#[spacetimedb::reducer]
pub fn call_lambda(ctx: &ReducerContext, app_hash:u256, lam:u256, call_id: u32, arg:String)->Result<(), String>{

  if !is_hosting(ctx, app_hash, ctx.sender){
    return Err("app not installed on self".to_string());
  }

  let dbctxex = mk_object(vec![
    ("DB".into(), mk_object(vec![
      ("set".into(), (Value::NativeFn("DBSet".into())).into()),
      ("get".into(), (Value::NativeFn("DBGet".into())).into()),
    ])),
    ("self".into(), (Value::String(identity_string(ctx.sender)).into())),
    ("notify".into(), (Value::NativeFn("Notify".into())).into()),
    ]);

  let by_key_and_owner: RangedIndex<_, (u256, Identity), _> = ctx.db.store().storekey();
  let lam = ctx.db.lambda().id().find(lam).ok_or("lambda not found")?;
  let app = ctx.db.app().id().find(app_hash).ok_or("app not found")?;
  let setup = app.setup;

  let lamex = parse(&lam.code).map_err(|e| e.to_string())?;
  let argex = parse(&arg).map_err(|e| e.to_string())?;
  let get_ctx_ex = parse(&setup).map_err(|e| e.to_string())?;

  let ctx_ex = mk_call(get_ctx_ex, vec![dbctxex.clone()]);

  let ctx_ex = Expr::Object(vec![
    ObjElem::Spread(dbctxex),
    ObjElem::Spread(ctx_ex.into()),
  ]);

  let finast = Expr::Call(Box::new(lamex), vec![ctx_ex, argex]);


  let native_fns = |fname: &str, args: Vec<Value>|{

    match (fname, args.as_slice()){
      ("DBSet", [Value::String(owner), Value::String(key), content]) => {
        let owner = identity_from_string(&owner);
        if !is_hosting(ctx, app_hash, owner){
          return Err("app not installed on owner".to_string());
        }
        let content = read_back(content);
        let key = hash_key(app.id, &key);
        log::info!("setting {}, {}, {}", owner, app.id, &key);
        by_key_and_owner.delete((key, owner));
        ctx.db.store().insert(Store{key, owner, content:content.clone()});        
        Ok(Value::Null)
      },
      ("DBGet", [Value::String(owner), Value::String(key)]) => {
        let owner = identity_from_string(&owner);
        let key = hash_key(app.id, &key);
        let val = match by_key_and_owner.filter((key,owner)).next(){
          Some(st) => {
            let (res,logs) = eval(&parse(&st.content).map_err(|e| e.to_string())?)?;
            (*res).clone()
          },
          None => Value::Null,
        };
        Ok(val)
      },

      ("Notify", [Value::String(target), v]) => {

        let target = identity_from_string(&target);
        if !is_hosting(ctx, app_hash, target){
          return Err("app not installed on target".to_string());
        }
        let content = read_back(v);
        let note = Notification{
          target,
          app:app.id,
          sender:ctx.sender,
          arg:content
        };

        if let Err(_) = ctx.db.notification().try_insert(note.clone()){
          ctx.db.notification().target().update(note);
        };
        Ok(Value::Null)
      },

      (_, _) => return Err(format!("function {} not found", fname))
    }
  };


  let (result, logs) = match eval_native(&finast, native_fns){
    Ok((res, logs)) => {
      let read = if (*res.clone() == Value::Undefined) {
        Value::Null
      }else{
        (*res).clone()
      };
      (LamResult::Ok(read_back(&read)), logs)
    },
    Err((e, logs)) => (LamResult::Err(format!("error in {}: {}", lam.code, e)), logs),
  };

  let ret  = Return{
    owner:ctx.sender,
    app:app.id,
    id: call_id,
    logs,
    result,
  };

  ctx.db.returns().owner().update(ret);
  Ok(())

}



#[reducer(client_connected)]
pub fn identity_connected(_ctx: &ReducerContext) {
  let dummy = Return{ owner:_ctx.sender, app:u256::from(0u8), id: 0,
    logs:vec![],
    result:LamResult::Ok("".to_string()),
  };
  if let Err(_) = _ctx.db.returns().try_insert(dummy.clone()){
    _ctx.db.returns().owner().update(dummy);
  };
}
