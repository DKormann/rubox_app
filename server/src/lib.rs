

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


// #[table(name = host, public, index(name = hostkey, btree(columns = [host, app])))]
// pub struct Host{
//   host:Identity,
//   app:u256,
// }


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

#[derive(Clone)]
#[table(name = returns, public)]
pub struct Return{
  #[primary_key]
  owner:Identity,
  app:u256,
  id: u32,
  content:String,
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

#[reducer]
pub fn sethost(ctx: &ReducerContext, app:u256, value:bool){

  if value{
    ctx.db.store().insert(Store{key:hash_key(app, "host"), owner:ctx.sender, content:value.to_string()});
  }else{
    ctx.db.store().delete(Store{key:hash_key(app, "host"), owner:ctx.sender, content:value.to_string()});
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


fn identity_string(id:Identity)->String{
  format!("id{}", id.to_hex())
}


#[spacetimedb::reducer]
pub fn call_lambda(ctx: &ReducerContext, other:Identity, app:u256, lam:u256, call_id: u32, arg:String)->Result<(), String>{

  let dbctxex = mk_object(vec![
    ("DB".into(), mk_object(vec![
      ("set".into(), (Value::NativeFn("DBSet".into())).into()),
      ("get".into(), (Value::NativeFn("DBGet".into())).into()),
    ])),
    ("self".into(), (Value::String(identity_string(ctx.sender)).into())),
    ("other".into(), (Value::String(identity_string(other)).into())),
    ("notify".into(), (Value::NativeFn("Notify".into())).into()),
    ]);

  let by_key_and_owner: RangedIndex<_, (u256, Identity), _> = ctx.db.store().storekey();
  by_key_and_owner.filter((hash_key(app, "host"), other)).next().ok_or("app not installed on other")?;
  by_key_and_owner.filter((hash_key(app, "host"), ctx.sender)).next().ok_or("app not installed on self")?;

  let lam = ctx.db.lambda().id().find(lam).ok_or("lambda not found")?;
  let app = ctx.db.app().id().find(app).ok_or("app not found")?;
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
      ("DBSet", [Value::Boolean(from_me), Value::String(key), content]) => {
        let content = read_back(content);
        let owner = if *from_me {ctx.sender} else {other};
        let key = hash_key(app.id, &key);
        log::info!("setting {}, {}, {}", owner, app.id, &key);
        by_key_and_owner.delete((key, owner));
        ctx.db.store().insert(Store{key, owner, content:content.clone()});        
        Ok(Value::Null)
      },
      ("DBGet", [Value::Boolean(from_me), Value::String(key)]) => {
        let owner = if *from_me {ctx.sender} else {other};
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

      ("Notify", [v]) => {

        let content = read_back(v);
        let note = Notification{
          target:other,
          app:app.id,
          sender:ctx.sender,
          arg:content
        };

        if let Err(_) = ctx.db.notification().try_insert(note.clone()){
          ctx.db.notification().target().update(note);
        };
        Ok(Value::Null)
      },

      (_, _) => return Err("function not found".to_string())
    }
  };


  let (res, logs) = eval_native(&finast, native_fns)?;


  let key = hash_fun_args(ctx.sender, other, app.id, lam.id, &arg);

  let res = Value::Array(vec![
    if (res == Value::Undefined.into()) {Value::Null.into()} else {res.into()},
    Value::Array(logs.iter().map(|l| Rc::new(Value::String(l.clone()))).collect()).into()
  ]);

  let ret  = Return{
    owner:ctx.sender,
    app:app.id,
    id: call_id,
    content:read_back(&res)
  };



  if let Err(_) =
    ctx.db.returns().try_insert(ret.clone()){
    ctx.db.returns().owner().update(ret);
  };
  Ok(())

}


#[reducer(client_connected)]
pub fn identity_connected(_ctx: &ReducerContext) {
  _ctx.db.returns().insert(Return{
    owner:_ctx.sender,
    app:u256::from(0u8),
    id: 0,
    content: "".to_string()
  });
}
