
// runtime should be equivalent to JavaScript semantics


#[allow(dead_code)]
#[allow(unreachable_code)]



use im::HashMap;
use std::mem;
use std::rc::Rc;
use std::cell::RefCell;

use crate::lang::ast::*;
use crate::Store;

fn v(val: Value) -> VRef {
Rc::new(val)
}


fn cmp_numbers(a: f64, b: f64, op: &str) -> Result<VRef, String> {
  let res = match op { "==" => a == b, "!=" => a != b, ">" => a > b, "<" => a < b, ">=" => a >= b, "<=" => a <= b, _ => unreachable!() };
  Ok(v(Value::Boolean(res)))
}

fn cmp_strings(a: &String, b: &String, op: &str) -> Result<VRef, String> {
  let res = match op { "==" => a == b, "!=" => a != b, ">" => a > b, "<" => a < b, ">=" => a >= b, "<=" => a <= b, _ => unreachable!() };
  Ok(v(Value::Boolean(res)))
}

fn cmp_bools(a: bool, b: bool, op: &str) -> Result<VRef, String> {
  let res = match op { "==" => a == b, "!=" => a != b, ">" => a && !b, "<" => !a && b, ">=" => a || (!a && !b), "<=" => !a || (a && b),
  "||" => a || b,
  "&&" => a && b,
  _ => unreachable!() };
  Ok(v(Value::Boolean(res)))
}

pub fn env_extend(parent: Option<EnvRef>) -> EnvRef {
  Rc::new(EnvData {
  bindings: RefCell::new(HashMap::new()),
  parent,
  })
}


fn lookup(env: &EnvRef, name: &str) -> Option<VRef> {
  env.bindings
  .borrow()
  .get(name)
  .cloned()
  .or_else(|| env.parent.as_ref().and_then(|p| lookup(p, name)))
}


pub fn eval(expr: &Expr)->Result<VRef, String>{
  do_eval(expr,&env_extend(None),|_, _| Err("native function not found".into()))
}

pub fn cast_bool(val: &Value)->bool{
  match val {
    Value::Boolean(b) => *b,
    Value::Int(i)=>*i != 0,
    Value::Float(f)=>*f != 0.0,
    Value::String(s)=>!s.is_empty(),
    Value::Array(arr)=>!arr.is_empty(),
    Value::Object(obj)=>!obj.is_empty(),
    Value::Null=>false,
    Value::Undefined=>false,
    _ => true,
  }
}

pub fn do_eval(
  expr: &Expr,
  env: &EnvRef,
  native_fns: impl Fn(&str, Vec<Value>)->Result<Value, String> + Clone
) -> Result<VRef, String> {
  match expr {
  Expr::Var(name) => lookup(env, name)
  .ok_or_else(|| format!("unbound variable {}", name)),

      Expr::Value(val) => Ok(val.clone().into()),
      Expr::Fn(params, body) => {

        Ok(v(Value::Closure(Closure {
            params: params.clone(),
            body: *body.clone(),
            env: env.clone(),
        })))
      }

      Expr::Call(func_expr, arg_exprs) => {
          // Evaluate the function expression.
          let fun = do_eval(func_expr, env, native_fns.clone())?;

          let mut arg_vals = Vec::with_capacity(arg_exprs.len());
          for a in arg_exprs {
              arg_vals.push(do_eval(a, env, native_fns.clone())?);
          }

          match fun.as_ref() {
              Value::Closure(cl) => {
                  if cl.params.len() != arg_vals.len() {
                      return Err(format!(
                          "arity mismatch: expected {} arguments, got {}",
                          cl.params.len(),
                          arg_vals.len()
                      ));
                  }

                  let call_env = Rc::new(EnvData {
                      bindings: RefCell::new(HashMap::new()),
                      parent: Some(cl.env.clone()),
                  });
                  for (param, arg) in cl.params.iter().zip(arg_vals) {
                      call_env.bindings.borrow_mut().insert(param.clone(), arg);
                  }

                  do_eval(&cl.body, &call_env, native_fns)
              }
              Value::Builtin(builtin)=>{
                match builtin {
                  Builtin::ObjectKeys=>{
                    let mut keys: Vec<Rc<Value>> = Vec::new();
                    match arg_vals.get(0) {
                      Some(obj)=>{
                        match obj.as_ref() {
                          Value::Object(obj_map)=>{
                            for (k,_) in obj_map {
                              keys.push(v(Value::String(k.clone())));
                            }
                          }
                          _=>return Err("attempted to call Object.keys on a non-object value".into())
                        }
                      }
                      _=>return Err("attempted to call Object.keys on a non-object value".into())
                    }
                    Ok(v(Value::Array(keys)))
                  },
                  _ => Err("attempted call a non‑function value".into()),
                }
              },
              Value::NativeFn(func)=>{

                let args: Vec<Value> = arg_vals.into_iter().map(|v| (*v).clone()).collect();
                let res = native_fns(func, args)?;
                Ok(v(res))
              },
              _ => Err("attempted call a non‑function value".into()),
          }
      }

      Expr::Let(name, val_expr, body) => {
          // Make a new environment frame we can mutate in place
          let final_env = Rc::new(EnvData {
              bindings: RefCell::new(HashMap::new()),
              parent: Some(env.clone()),
          });

          // Evaluate RHS in an environment that already has the binding name available
          // so recursive functions can reference themselves.
          // Insert a temporary Undefined to allow self-reference during RHS evaluation.
          final_env.bindings.borrow_mut().insert(name.clone(), v(Value::Undefined));

          let val = match val_expr.as_ref() {
              Expr::Fn(params, f_body) => {
                  // Closure captures the final_env so recursive calls see the binding
                  v(Value::Closure(Closure {
                      params: params.clone(),
                      body: *f_body.clone(),
                      env: final_env.clone(),
                  }))
              }
              _ => do_eval(val_expr, &final_env, native_fns.clone())?,
          };

          // Update binding in place
          final_env.bindings.borrow_mut().insert(name.clone(), val);

          do_eval(body, &final_env, native_fns)
      }
      Expr::Array(arr) =>{
        let mut narr: Vec<Rc<Value>> = Vec::new();
        for elem in arr {
          match elem {
            ArrElem::Expr(e) => {
              let val = do_eval(e,env,native_fns.clone())?;
              narr.push(val);
            },
            ArrElem::Spread(e) => {
              let val = do_eval(e,env,native_fns.clone())?;
              match val.as_ref() {
                Value::Array(arr) => {
                  for v in arr {
                    narr.push(v.clone())
                  }
                }
                _=>return Err("attempted to spread a non-array value".into())
              }
            }
          }
        }
        Ok(v(Value::Array(narr)))
      },
      Expr::Object(obj_expr) => {
          let mut obj:HashMap<String, Rc<Value>> = HashMap::new();
          for elem in obj_expr {
            match elem {
              ObjElem::Expr((key,value)) => {
                let val = do_eval(value,env,native_fns.clone())?;
                obj.insert(key.clone(), val);
              },
              ObjElem::Spread(e) => {
                let val = do_eval(e,env,native_fns.clone())?;
                match val.as_ref() {
                  Value::Object(obj_map) => {
                    for (k,v_ref) in obj_map {
                      obj.insert(k.clone(), v_ref.clone());
                    }
                  }
                  _=>return Err("attempted to spread a non-object value".into())
                }
              }
            }
          }


          Ok(v(Value::Object(obj)))
      }
      Expr::Index(arr, idx)=> {
        let arr_val = do_eval(arr,env,native_fns.clone())?;
        let idx_val = do_eval(idx,env,native_fns.clone())?;
        match arr_val.as_ref() {
          Value::Array(items) => {
            use std::convert::TryFrom;
            let i: i32 = i32::try_from(idx_val.as_ref()).map_err(|_| "index must be an Int")?;
            if i < 0 || (i as usize) >= items.len() {
              return Err("index out of bounds".into());
            }
            Ok(items[i as usize].clone())
          }
          _=>return Err("attempted to index a non-array value".into())
        }
      },
      Expr::Access(primary, prop)=> {
        let primary_val = do_eval(primary,env,native_fns.clone())?;
        match primary_val.as_ref() {
          Value::Object(obj) => {
            obj.get(prop)
            .cloned()
            .ok_or_else(|| format!("property {} not found on object", prop))
          }

          Value::Array(arr)=>{
            match prop.as_str() {
              "length" => Ok(v(Value::Int(arr.len() as i32))),
              "concat" => {
                let other = do_eval(primary,env,native_fns.clone())?;
                match other.as_ref() {
                  Value::Array(other_arr)=>{
                    let mut narr: Vec<Rc<Value>> = Vec::new();
                    for v in arr {
                      narr.push(v.clone());
                    }
                    for v in other_arr {
                      narr.push(v.clone());
                    }
                    Ok(v(Value::Array(narr)))
                  }
                  _=>return Err("attempted to concatenate a non-array value".into())
                }
              }
              "map" => todo!(),
              "filter" => todo!(),
              "reduce" => todo!(),
              "find" => todo!(),
              "findIndex" => todo!(),
              "includes" => todo!(),
              "indexOf" => todo!(),
              "lastIndexOf" => todo!(),
              "join" => todo!(),
              "slice" => todo!(),
              _=>return Err(format!("property {} not found on array", prop))
            }
          }

          Value::Builtin(builtin)=>{
            match builtin {
              Builtin::Object => match prop.as_str() {
                "keys" => Ok(v(Value::Builtin(Builtin::ObjectKeys))),
                "values" => Ok(v(Value::Builtin(Builtin::ObjectValues))),
                "entries" => Ok(v(Value::Builtin(Builtin::ObjectEntries))),
                _=>return Err(format!("property {} not found on object", prop))
              },
              Builtin::Array => match prop.as_str() {
                "from" => Ok(v(Value::Builtin(Builtin::ArrayFrom))),
                _=>return Err(format!("property {} not found on array", prop))
              },
              Builtin::DB => match prop.as_str() {
                "get" => Ok(v(Value::Builtin(Builtin::DBGet))),
                "set" => Ok(v(Value::Builtin(Builtin::DBSet))),
                "has" => Ok(v(Value::Builtin(Builtin::DBHas))),
                "delete" => Ok(v(Value::Builtin(Builtin::DBDelete))),
                "update" => Ok(v(Value::Builtin(Builtin::DBUpdate))),
                _=>return Err(format!("property {} not found on db", prop))
              },
              _=>return Err(format!("property {} not found on builtin", prop))
            }
          },
          _=>return Err("attempted to access a non-object value".into())
        }
      },
      Expr::Conditional(c,t,e) => {
        let v = do_eval(c, env, native_fns.clone())?;

        if cast_bool(&v) { do_eval(t, env, native_fns.clone()) } else { do_eval(e, env, native_fns) }
      },
      Expr::Binop(left, op, right) => {

        // Evaluate operands
        let lv = do_eval(left, env, native_fns.clone())?;
        let rv = do_eval(right, env, native_fns.clone())?;

        match op.as_str() {
          "+" => {
            match (lv.as_ref(), rv.as_ref()) {
              (Value::Int(a), Value::Int(b)) => Ok(v(Value::Int(a + b))),
              (Value::Float(a), Value::Float(b)) => Ok(v(Value::Float(a + b))),
              (Value::String(a), Value::String(b)) => Ok(v(Value::String(format!("{}{}", a, b)))),
              (Value::Int(a), Value::Float(b)) => Ok(v(Value::Float(*a as f64 + b))),
              (Value::Float(a), Value::Int(b)) => Ok(v(Value::Float(a + *b as f64))),
              _ => Err("unsupported + operands".into()),
            }
          }
          "-" | "*" | "/" => {
            // Coerce numeric pairs (int/float)
            let as_float = match (lv.as_ref(), rv.as_ref()) {
              (Value::Int(a), Value::Int(b)) => (Some(*a as f64), Some(*b as f64)),
              (Value::Int(a), Value::Float(b)) => (Some(*a as f64), Some(*b)),
              (Value::Float(a), Value::Int(b)) => (Some(*a), Some(*b as f64)),
              (Value::Float(a), Value::Float(b)) => (Some(*a), Some(*b)),
              _ => (None, None),
            };
            if let (Some(a), Some(b)) = as_float {
              // If both were Ints, prefer Int results when exact
              if let (Value::Int(ai), Value::Int(bi)) = (lv.as_ref(), rv.as_ref()) {
                match op.as_str() {
                  "-" => return Ok(v(Value::Int(ai - bi))),
                  "*" => return Ok(v(Value::Int(ai * bi))),
                  "/" => {
                    if *bi == 0 { return Err("division by zero".into()); }
                    if ai % bi == 0 { return Ok(v(Value::Int(ai / bi))); }
                    return Ok(v(Value::Float(a / b)));
                  }
                  _ => unreachable!(),
                }
              }
              // Mixed numeric types -> Float
              let res = match op.as_str() { "-" => a - b, "*" => a * b, "/" => a / b, _ => unreachable!() };
              Ok(v(Value::Float(res)))
            } else {
              Err("numeric operator on non-numeric values".into())
            }
          }

          "||" =>Ok(if cast_bool(&lv ) { lv } else { rv } .clone()),
          "&&" =>Ok(if cast_bool(&lv ) { rv } else { lv } .clone()),
          "??" =>Ok(match lv.as_ref() {Value::Null | Value::Undefined => rv, _ => lv,}.clone()),

          "==" | "!=" | ">" | "<" | ">=" | "<=" => {
            let res = match (lv.as_ref(), rv.as_ref(), op.as_str()) {
              // numeric comparisons (coerce to float)
              (Value::Int(a), Value::Int(b), op) => cmp_numbers(*a as f64, *b as f64, op),
              (Value::Int(a), Value::Float(b), op) => cmp_numbers(*a as f64, *b, op),
              (Value::Float(a), Value::Int(b), op) => cmp_numbers(*a, *b as f64, op),
              (Value::Float(a), Value::Float(b), op) => cmp_numbers(*a, *b, op),
              // string comparisons
              (Value::String(a), Value::String(b), op) => cmp_strings(a, b, op),
              // boolean comparisons
              (Value::Boolean(a), Value::Boolean(b), op) => cmp_bools(*a, *b, op),
              // equality/inequality for other types: pointer/variant equality
              (la, rb, "==") => Ok(v(Value::Boolean(la == rb))),
              (la, rb, "!=") => Ok(v(Value::Boolean(la != rb))),
              _ => Err("unsupported comparison operands".into()),
            }?;
            Ok(res)
          }
          _ => Err("unknown operator".into()),
        }
      },
  }
}
