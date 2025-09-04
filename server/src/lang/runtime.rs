
// runtime should be equivalent to JavaScript semantics


#[allow(dead_code)]
#[allow(unreachable_code)]



use im::HashMap;
use std::mem;
use std::rc::Rc;
use std::cell::RefCell;

use crate::lang::ast::*;
use crate::lang::readback::{read_back, read_back_expr};
use crate::Store;

fn v(val: Value) -> VRef {
Rc::new(val)
}
fn collect_pattern_idents(pattern: &Expr, out: &mut Vec<String>) {
  match pattern {
    Expr::Var(name) => out.push(name.clone()),
    Expr::Array(items) => {
      for item in items {
        match item {
          ArrElem::Expr(Expr::Var(name)) => out.push(name.clone()),
          ArrElem::Spread(Expr::Var(name)) => out.push(name.clone()),
          _ => {}
        }
      }
    }
    Expr::Object(props) => {
      for prop in props {
        if let ObjElem::Expr((_key, Expr::Var(name))) = prop {
          out.push(name.clone());
        }
      }
    }
    _ => {}
  }
}

fn bind_pattern(pattern: &Expr, value: &VRef, env: &EnvRef) -> Result<(), String> {
  match (pattern, value.as_ref()) {
    (Expr::Var(name), v) => {
      env.bindings.borrow_mut().insert(name.clone(), Rc::new(v.clone()));
      Ok(())
    }
    (Expr::Array(items), Value::Array(vals)) => {
      let mut index: usize = 0;
      let total = items.len();
      // If there is a spread, it must be the last element we produced in the pattern
      for (pos, item) in items.iter().enumerate() {
        match item {
          ArrElem::Expr(Expr::Var(name)) => {
            if index >= vals.len() { env.bindings.borrow_mut().insert(name.clone(), Rc::new(Value::Undefined)); }
            else { env.bindings.borrow_mut().insert(name.clone(), vals[index].clone()); }
            index += 1;
          }
          ArrElem::Spread(Expr::Var(name)) => {
            // bind the rest of the elements
            let rest: Vec<Rc<Value>> = if index < vals.len() { vals[index..].to_vec() } else { Vec::new() };
            env.bindings.borrow_mut().insert(name.clone(), Rc::new(Value::Array(rest)));
            index = vals.len();
            // spread must be last; ignore anything after
            if pos + 1 != total { /* allow but ignore to keep simple */ }
          }
          _ => return Err("array destructuring must bind to identifiers".into()),
        }
      }
      Ok(())
    }
    (Expr::Object(props), Value::Object(obj)) => {
      for prop in props {
        if let ObjElem::Expr((key, Expr::Var(name))) = prop {
          let val = obj.get(key).cloned().unwrap_or_else(|| Rc::new(Value::Undefined));
          env.bindings.borrow_mut().insert(name.clone(), val);
        } else {
          return Err("object destructuring must bind to identifiers".into());
        }
      }
      Ok(())
    }
    (Expr::Array(_), _) => Err("cannot destructure non-array as array".into()),
    (Expr::Object(_), _) => Err("cannot destructure non-object as object".into()),
    _ => Err("invalid destructuring pattern".into()),
  }
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
  parent: parent.or_else(|| Some(get_std())),
  })
}




fn lookup(env: &EnvRef, name: &str) -> Option<VRef> {
  env.bindings
  .borrow()
  .get(name)
  .cloned()
  .or_else(|| env.parent.as_ref().and_then(|p| lookup(p, name)))
}





pub fn eval(expr: &Expr)->Result<(VRef, Vec<String>), String>{
  let mut logs = vec![];


  let res = do_eval(expr, &env_extend(None), |_, _| Err("native function not found".into()), &mut logs)?;
  Ok((res, logs))
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

fn run_closure(
  cl: &Closure,
  arg_vals: Vec<Rc<Value>>,
  env: &EnvRef,
  native_fns: impl Fn(&str, Vec<Value>)->Result<Value, String> + Clone,
  logs: &mut Vec<String>
) -> Result<VRef, String>{              if cl.params.len() != arg_vals.len() {
    return Err(format!(
      "arity mismatch: expected {} arguments : {}, got {}",
      cl.params.len(),
      cl.params.iter().map(|p| p.clone()).collect::<Vec<String>>().join(", "),
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


  let res = do_eval(&cl.body, &call_env, native_fns, logs)?;

  match res.as_ref(){
    Value::ReturnValue{val}=>{
      match &cl.body{
        Expr::ReturnCmd(_) | Expr::Conditional(_, _, _) | Expr::Let(_, _, _) =>{},
        _=>panic!("return value not expected")
      };
      Ok(val.clone())
    },
    _=>Ok(res)
  }

}



pub fn get_std()->EnvRef{
  let std = Rc::new(EnvData {
    bindings: RefCell::new(HashMap::from_iter(vec![
      ("console".into(), v(Value::Object(HashMap::from_iter(vec![("log".into(), v(Value::Builtin(Builtin::ConsoleLog)))]))))
    ])),
    parent: None,
  });
  std
}


pub fn eval_native(expr: &Expr, native_fns: impl Fn(&str, Vec<Value>)->Result<Value, String> + Clone)->Result<(VRef, Vec<String>), (String, Vec<String>)>{
  let mut logs = vec![];

  match do_eval(expr, &env_extend(None), native_fns, &mut logs) {
    Ok(res)=>Ok((res, logs)),
    Err(e)=>Err((e, logs))
  }
}

pub fn do_eval(
  expr: &Expr,
  env: &EnvRef,
  native_fns: impl Fn(&str, Vec<Value>)->Result<Value, String> + Clone,
  logs: &mut Vec<String>
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
        let fun = do_eval(func_expr, env, native_fns.clone(), logs)?;

        let mut arg_vals = Vec::with_capacity(arg_exprs.len());
        for a in arg_exprs {
          arg_vals.push(do_eval(a, env, native_fns.clone(), logs)?);
        }

        match fun.as_ref() {
          Value::Closure(cl) => {
            run_closure(cl, arg_vals, env, native_fns, logs)
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
                  _=>return Err("attempted to call Object.keys on a nothing".into())
                }
                Ok(v(Value::Array(keys)))
              },
              Builtin::ArrMethod(self_arr, method)=>{
                match method {
                  Method::ArrayConcat=>{
                    let mut narr: Vec<Rc<Value>> = Vec::new();
                    for v in self_arr {narr.push(v.clone());};
                    for v in arg_vals {
                      match v.as_ref() {
                        Value::Array(arr) => {
                          for v in arr {
                            narr.push(v.clone());
                          }
                        }
                        _=>narr.push(v.clone())
                      }
                    }
                    Ok(v(Value::Array(narr)))
                  },
                  Method::ArrayMap=>{
                    let mut narr: Vec<Rc<Value>> = Vec::new();
                    let fun = arg_vals.get(0).ok_or(format!("attempted to map a non-function value"))?;
                    match fun.as_ref() {
                      Value::Closure(cl)=>{
                        for (i,v) in self_arr.iter().enumerate() {
                          // let res = run_closure(cl, vec![v.clone()], env, native_fns.clone())?;
                          let args = if (cl.params.len() == 1) {vec![v.clone()]} else {vec![v.clone(), Rc::new(Value::Int(i as i32))]};
                          let res = run_closure(cl, args, env, native_fns.clone(), logs)?;
                          narr.push(res);
                        }
                      }
                      _=>return Err("attempted to map a non-function value".into())
                    }
                    Ok(v(Value::Array(narr)))
                  },

                  Method::ArrayFilter=>{
                    let mut narr: Vec<Rc<Value>> = Vec::new();
                    let fun = arg_vals.get(0).ok_or(format!("attempted to filter a non-function value"))?;
                    match fun.as_ref() {
                      Value::Closure(cl)=>{
                        for v in self_arr {
                          let res = run_closure(cl, vec![v.clone()], env, native_fns.clone(), logs)?;
                          if cast_bool(&res) {
                            narr.push(v.clone());
                          }
                        };
                        Ok(v(Value::Array(narr)))
                      }
                      _=>return Err("attempted to filter a non-function value".into())
                    }
                  },
                  Method::ArrayIncludes=>{
                    let val = arg_vals.get(0).ok_or(format!("attempted to include a non-value"))?;
                    let mut found = false;
                    for v in self_arr {
                      if v == val {found = true; break;}
                    }
                    Ok(v(Value::Boolean(found)))
                  },
                  Method::ArrayReduce=>{
                    let fun = arg_vals.get(0).ok_or(format!("no function provided for reduce"))?;
                    let mut acc = arg_vals.get(1).cloned().unwrap_or_else(|| v(Value::Undefined));
                    match fun.as_ref() {
                      Value::Closure(cl)=>{
                        for v in self_arr {
                          let args = if (cl.params.len() == 1) {vec![v.clone()]} else {vec![acc.clone(), v.clone()]};
                          acc = run_closure(cl, args, env, native_fns.clone(), logs)?;
                        }
                        Ok(acc)
                      }
                      _=>return Err("attempted to reduce a non-function value".into())
                    }
                  }
                  _=>return Err(format!("method {:?} not found on array", method))
                }
              },
              Builtin::MathAbs | Builtin::MathCeil | Builtin::MathFloor | Builtin::MathRound => {
                let val = arg_vals.get(0).ok_or(format!("attempted to call math function with no value"))?;
                match val.as_ref() {
                  Value::Int(i)=>match builtin {
                    Builtin::MathAbs=>Ok(v(Value::Int(i.abs()))),
                    Builtin::MathCeil=>Ok(v(Value::Int(*i))),
                    Builtin::MathFloor=>Ok(v(Value::Int(*i))),
                    _=>unreachable!()
                  },
                  Value::Float(f)=>match builtin {
                    Builtin::MathAbs=>Ok(v(Value::Float(f.abs()))),
                    Builtin::MathCeil=>Ok(v(Value::Float(f.ceil()))),
                    Builtin::MathFloor=>Ok(v(Value::Int(f.floor() as i32))),
                    Builtin::MathRound=>Ok(v(Value::Float(f.round()))),
                    _=>unreachable!()
                  },
                  _=>unreachable!()
                }
              },
              Builtin::ConsoleLog=>{
                let val = arg_vals.get(0).ok_or(format!("attempted to call console.log with no value"))?;
                logs.push(read_back(val));
                Ok(v(Value::Null))
              },
              _=>return Err(format!("not implemented: {:?}", builtin))
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

      Expr::Let(bindr, val_expr, body) => {
        let final_env = Rc::new(EnvData {
            bindings: RefCell::new(HashMap::new()),
            parent: Some(env.clone()),
        });

        {
          let mut predeclared: Vec<String> = Vec::new();
          collect_pattern_idents(bindr.as_ref(), &mut predeclared);
          let mut frame = final_env.bindings.borrow_mut();
          for name in predeclared {
            frame.insert(name, v(Value::Undefined));
          }
        }

        let rhs_val: Rc<Value> = match val_expr.as_ref() {
          Expr::Fn(params, f_body) => {
              v(Value::Closure(Closure {
                  params: params.clone(),
                  body: *f_body.clone(),
                  env: final_env.clone(),
              }))
          }
          _ => match do_eval(val_expr, &final_env, native_fns.clone(), logs){

            Ok(val)=>{
              match val.as_ref(){
                Value::ReturnValue{val: inner}=>{
                  return Ok(v(Value::ReturnValue{ val: inner.clone() }));
                },
                _=>val,
              }
            },
            Err(e)=>{

              return Err(format!("in {:?}:\n{}", read_back_expr(bindr.as_ref()), e));
            }
          },
        };

        bind_pattern(bindr.as_ref(), &rhs_val, &final_env)?;
        do_eval(body, &final_env, native_fns, logs)
      }
      Expr::Array(arr) =>{
        let mut narr: Vec<Rc<Value>> = Vec::new();
        for elem in arr {
          match elem {
            ArrElem::Expr(e) => {
              let val = do_eval(e,env,native_fns.clone(), logs)?;
              narr.push(val);
            },
            ArrElem::Spread(e) => {
              let val = do_eval(e,env,native_fns.clone(), logs)?;
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
                let val = do_eval(value,env,native_fns.clone(), logs)?;
                obj.insert(key.clone(), val);
              },
              ObjElem::Spread(e) => {
                let val = do_eval(e,env,native_fns.clone(), logs)?;
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
        let arr_val = do_eval(arr,env,native_fns.clone(), logs)?;
        let idx_val = do_eval(idx,env,native_fns.clone(), logs)?;
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
        let primary_val = do_eval(primary,env,native_fns.clone(), logs)?;
        match primary_val.as_ref() {
          Value::Object(obj) => {
            obj.get(prop)
            .cloned()
            .ok_or_else(|| format!("property {} not found on object", prop))
          }



          Value::Array(arr)=>{
            match prop.as_str() {
              "length" => Ok(v(Value::Int(arr.len() as i32))),
              _=>{let method: Result<Method, String>= match prop.as_str() {
                "concat" => Ok(Method::ArrayConcat),
                "map" => Ok(Method::ArrayMap),
                "filter" => Ok(Method::ArrayFilter),
                "reduce" => Ok(Method::ArrayReduce),
                "find" => Ok(Method::ArrayFind),
                "findIndex" => Ok(Method::ArrayFindIndex),
                "includes" => Ok(Method::ArrayIncludes),
                "indexOf" => Ok(Method::ArrayIndexOf),
                "lastIndexOf" => Ok(Method::ArrayLastIndexOf),
                "join" => Ok(Method::ArrayJoin),
                "slice" => Ok(Method::ArraySlice),
                _=>return Err(format!("property {} not found on array", prop))
              };
              Ok(v(Value::Builtin(Builtin::ArrMethod(arr.clone(), method?)))
              )
            }}
          }

          Value::String(s)=>{
            match prop.as_str() {
              "length" => Ok(v(Value::Int(s.len() as i32))),
              _=>return Err(format!("property {} not found on string", prop))
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
                _=>return Err(format!("property {} not found on Array class", prop))
              },
              Builtin::Math => match prop.as_str() {
                "abs" => Ok(v(Value::Builtin(Builtin::MathAbs))),
                "ceil" => Ok(v(Value::Builtin(Builtin::MathCeil))),
                "floor" => Ok(v(Value::Builtin(Builtin::MathFloor))),
                "round" => Ok(v(Value::Builtin(Builtin::MathRound))),
                "max" => Ok(v(Value::Builtin(Builtin::MathMax))),
                "min" => Ok(v(Value::Builtin(Builtin::MathMin))),
                "random" => Ok(v(Value::Builtin(Builtin::MathRandom))),
                _=>return Err(format!("property {} not found on math", prop))
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


          _=>return Err(format!("attempted to access a non-object value : {:?} . {:?}", primary_val.as_ref(), prop))
        }
      },
      Expr::Conditional(c,t,e) => {
        let v = do_eval(c, env, native_fns.clone(), logs)?;
        if cast_bool(&v) { do_eval(t, env, native_fns.clone(), logs) } else { do_eval(e, env, native_fns, logs) }
      },
      Expr::Unop(op, expr) => {
        let val = do_eval(expr, env, native_fns.clone(), logs)?;
        match op.as_str() {
          "!" => Ok(v(Value::Boolean(!cast_bool(&val)))),
          "-" => Ok(v(Value::Int(-i32::try_from(val.as_ref()).map_err(|e| format!("int error: {:?}", e))?))),
          "-" => Ok(v(Value::Float(-f64::try_from(val.as_ref()).map_err(|e| format!("float error: {:?}", e))?))),
          _ => Err(format!("unknown operator: {:?}", op)),
        }
      },
      Expr::Binop(left, op, right) => {

        // Evaluate operands
        let lv = do_eval(left, env, native_fns.clone(), logs)?;
        let rv = do_eval(right, env, native_fns.clone(), logs);

        match op.as_str() {
          "+" => {
            match (lv.as_ref(), rv?.as_ref()) {
              (Value::Int(a), Value::Int(b)) => Ok(v(Value::Int(a + b))),
              (Value::Float(a), Value::Float(b)) => Ok(v(Value::Float(a + b))),
              (Value::String(a), Value::String(b)) => Ok(v(Value::String(format!("{}{}", a, b)))),
              (Value::Int(a), Value::Float(b)) => Ok(v(Value::Float(*a as f64 + b))),
              (Value::Float(a), Value::Int(b)) => Ok(v(Value::Float(a + *b as f64))),
              _ => Err("unsupported + operands".into()),
            }
          }
          "-" | "*" | "/" | "%" => {
            // Coerce numeric pairs (int/float)
            let rv = rv?;
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
                  "%" => return Ok(v(Value::Int(ai % bi))),
                  _ => unreachable!(),
                }
              }
              // Mixed numeric types -> Float
              let res = match op.as_str() { "-" => a - b, "*" => a * b, "/" => a / b, _ => unreachable!() };
              Ok(v(Value::Float(res)))
            } else {
              Err(format!("numeric operator {} on non-numeric values : {:?} {:?}", op, lv, rv))
            }
          }

          "||" =>Ok(if cast_bool(&lv ) { lv } else { rv? } .clone()),
          "&&" =>Ok(if cast_bool(&lv ) { rv? } else { lv } .clone()),
          "??" =>Ok(match lv.as_ref() {Value::Null | Value::Undefined => rv?, _ => lv,}.clone()),

          "==" | "!=" | ">" | "<" | ">=" | "<=" => {
            let res = match (lv.as_ref(), rv?.as_ref(), op.as_str()) {
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
          _ => Err(format!("unknown operator: {:?}", op)),
        }
      },
      Expr::ReturnCmd(block) => {
        let inner = do_eval(block, env, native_fns.clone(), logs)?;
        match inner.as_ref() {
          Value::ReturnValue { .. } => Ok(inner),
          _ => Ok(v(Value::ReturnValue { val: inner.clone() })),
        }
      },
    }
  }

