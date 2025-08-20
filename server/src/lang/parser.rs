

use im::HashMap;
use std::{rc::Rc};
use std::cell::RefCell;
use pest::Parser as PestParser;
use pest_derive::Parser;


use crate::lang::ast::*;

// Create a new (empty) frame whose parent is `parent`.
fn env_extend(parent: Option<EnvRef>) -> EnvRef {
    Rc::new(EnvData {
        bindings: RefCell::new(HashMap::new()),
        parent,
    })
}

#[derive(Parser)]
#[grammar = "lang/funscript.pest"]
struct FunscriptParser;

pub fn parse(input: &str) -> Result<Expr, pest::error::Error<Rule>> {
  let mut pairs = FunscriptParser::parse(Rule::program, input)?;
  let pair = pairs.next().unwrap();

  build_expr(pair.into_inner().next().unwrap())
}

fn build_expr(pair: pest::iterators::Pair<Rule>) -> Result<Expr, pest::error::Error<Rule>> {
  match pair.as_rule() {
    Rule::expr => build_expr(pair.into_inner().next().unwrap()),

    Rule::fun => {
      let mut inner = pair.into_inner();
      let params_pair = inner.next().unwrap();
      let params = build_params(params_pair);
    
      let body_pair = inner.next().unwrap();
      let body_expr = match body_pair.as_rule() {
        Rule::block => build_block(body_pair)?,
        _ => build_expr(body_pair)?,
      };
    
      Ok(mk_fn(params, body_expr))
    }



    Rule::primary => build_expr(pair.into_inner().next().unwrap()),
    Rule::operand => build_expr(pair.into_inner().next().unwrap()),
    Rule::multiplicative => build_left_associative_chain(pair),
    Rule::additive => build_left_associative_chain(pair),
    Rule::relational => build_left_associative_chain(pair),
    Rule::equality => build_left_associative_chain(pair),
    Rule::nullish => build_left_associative_chain(pair),
    Rule::logical_and => build_left_associative_chain(pair),
    Rule::logical_or => build_left_associative_chain(pair),
    // Destructuring patterns for let bindings
    Rule::pattern => build_expr(pair.into_inner().next().unwrap()),
    Rule::pattern_ident => {
      Ok(Expr::Var(pair.as_str().to_string()))
    }
    Rule::array_pattern => {
      let mut elems: Vec<ArrElem> = Vec::new();
      for p in pair.into_inner() { // pattern_ident or rest_pattern items
        match p.as_rule() {
          Rule::pattern_ident => {
            elems.push(ArrElem::Expr(Expr::Var(p.as_str().to_string())));
          }
          Rule::rest_pattern => {
            // inner ident
            let name = p.into_inner().next().unwrap().as_str().to_string();
            elems.push(ArrElem::Spread(Expr::Var(name)));
          }
          _ => {}
        }
      }
      Ok(Expr::Array(elems))
    }
    Rule::object_pattern => {
      let mut props: Vec<ObjElem> = Vec::new();
      for p in pair.into_inner() { // object_bind items
        if p.as_rule() == Rule::object_bind {
          let mut inner = p.into_inner();
          let key = inner.next().unwrap().as_str().to_string();
          let bind = match inner.next() {
            Some(b) => b.as_str().to_string(),
            None => key.clone(),
          };
          props.push(ObjElem::Expr((key, Expr::Var(bind))));
        }
      }
      Ok(Expr::Object(props))
    }
    Rule::ident => {
      let res = match pair.as_str(){
        // "DB"=>Expr::Value(Box::new(Value::Builtin(Builtin::DB))),
        // "Object" =>Expr::Value(Box::new(Value::Builtin(Builtin::Object))),
        // "Array" =>Expr::Value(Box::new(Value::Builtin(Builtin::Array))),
        _=>Expr::Var(pair.as_str().to_string()),
      };
      Ok(res)
    },
    Rule::literal => build_literal(pair),
    Rule::int | Rule::float | Rule::string | Rule::string2 | Rule::boolean | Rule::null | Rule::undefined => build_literal(pair),
    Rule::array => build_array(pair),
    Rule::object => build_object(pair),
    // no standalone blocks in expressions
    Rule::cond => {
      let mut inner = pair.into_inner();
      let c = build_expr(inner.next().unwrap())?;
      let t = build_expr(inner.next().unwrap())?;
      let e = build_expr(inner.next().unwrap())?;
      Ok(mk_conditional(c,t,e))
    },
    Rule::unop => {
      let mut inner = pair.into_inner();
      let op = inner.next().unwrap().as_str().to_string();
      let expr = build_expr(inner.next().unwrap())?;
      Ok(mk_unop(op, expr))
    },
    Rule::index => {
      let mut inner = pair.into_inner();
      let primary = build_expr(inner.next().unwrap())?;
      let index = build_expr(inner.next().unwrap())?;
      Ok(mk_index(primary,index))
    },
    Rule::access_chain =>{

      let mut inner = pair.into_inner();
      let primary = build_expr(inner.next().unwrap())?;

      let mut current = primary;
      for p in inner {
        match p.as_rule() {
          Rule::field => {
            let prop = p.as_str().to_string();
            current = mk_access(current, prop.split_once('.').unwrap().1.to_string());
          }
          Rule::index => {
            let index = build_expr(p.into_inner().next().unwrap())?;
            current = mk_index(current, index);
          }
          Rule::arglist => {
            let args = build_arglist(p)?;
            current = mk_call(current, args);
          }
          _ => unreachable!("unhandled rule in chain: {:?}", p.as_rule()),
        }
      };
      Ok(current)
    },

    _ => unreachable!("unhandled rule in expr: {:?}", pair.as_rule()),
  }
}

fn build_left_associative_chain(pair: pest::iterators::Pair<Rule>) -> Result<Expr, pest::error::Error<Rule>> {
  let mut inner = pair.into_inner();
  // first expression node
  let mut acc = build_expr(inner.next().unwrap())?;
  while let (Some(op_pair), Some(rhs_pair)) = (inner.next(), inner.next()) {
    let op_text = op_pair.as_str().to_string();
    let rhs = build_expr(rhs_pair)?;
    acc = mk_binop(acc, op_text, rhs);
  }
  Ok(acc)
}

fn build_params(pair: pest::iterators::Pair<Rule>) -> Vec<String> {
  let mut params: Vec<String> = Vec::new();
  let inner = pair.into_inner();
  for p in inner { // zero or more idents separated by commas
    params.push(p.as_str().to_string());
  }
  params
}

fn build_arglist(pair: pest::iterators::Pair<Rule>) -> Result<Vec<Expr>, pest::error::Error<Rule>> {
  let mut args: Vec<Expr> = Vec::new();
  for p in pair.into_inner() {
    let built = build_expr(p.clone())?;
    args.push(built);
  }
  Ok(args)
}

fn build_literal(pair: pest::iterators::Pair<Rule>) -> Result<Expr, pest::error::Error<Rule>> {
  let rule = pair.as_rule();
  let text = pair.as_str();
  let value = match rule {
    Rule::float => Value::Float(text.parse::<f64>().unwrap()),
    Rule::int => Value::Int(text.parse::<i32>().unwrap()),
    Rule::string => {
      // strip surrounding quotes and unescape basic escapes
      let raw = &text[1..text.len()-1];
      Value::String(unescape_basic_string(raw))
    },
    Rule::string2 => {
      // strip surrounding quotes and unescape basic escapes
      let raw = &text[1..text.len()-1];
      Value::String(unescape_basic_string(raw))
    },
    Rule::boolean => Value::Boolean(text == "true"),
    Rule::null => Value::Null,
    Rule::undefined => Value::Undefined,
    Rule::literal => {
      // delegate to the single inner literal
      return build_literal(pair.into_inner().next().unwrap());
    }
    _ => unreachable!(),
    };
    Ok(Expr::Value(Box::new(value)))
}

fn unescape_basic_string(input: &str) -> String {
  let mut out = String::with_capacity(input.len());
  let mut chars = input.chars();
  while let Some(c) = chars.next() {
    if c == '\\' {
      if let Some(n) = chars.next() {
        match n {
          'n' => out.push('\n'),
          'r' => out.push('\r'),
          't' => out.push('\t'),
          '"' => out.push('"'),
          '\'' => out.push('\''),
          '\\' => out.push('\\'),
          other => {
            out.push('\\');
            out.push(other);
          }
        }
      } else {
        out.push('\\');
      }
    } else {
      out.push(c);
    }
  }
  out
}

fn build_array(pair: pest::iterators::Pair<Rule>) -> Result<Expr, pest::error::Error<Rule>> {
  let mut elems: Vec<ArrElem> = Vec::new();
  for p in pair.into_inner() { // expr items
    match p.as_rule() {
      Rule::arrayItem => {

        let mut inner = p.into_inner().next().unwrap();
        elems.push(
          match inner.as_rule(){
            Rule::arrayItem => {
              let expr = build_expr(inner.into_inner().next().unwrap())?;
              ArrElem::Spread(expr)
            }
            Rule::spread => {
              let expr = build_expr(inner.into_inner().next().unwrap())?;
              ArrElem::Spread(expr)
            }
            _ => {
              let expr = build_expr(inner)?;
              ArrElem::Expr(expr)
            }
          }
        );
      }
      _ => unreachable!("unhandled rule in array: {:?}", p.as_rule()),
    }
  }
  Ok(Expr::Array(elems))
}

fn build_block(pair: pest::iterators::Pair<Rule>) -> Result<Expr, pest::error::Error<Rule>> {

  let mut lets: Vec<(Expr, Expr)> = Vec::new();
  let mut result: Option<Expr> = None;


  let mut inner = pair.into_inner().peekable();
  while let Some(p) = inner.next() {
    match p.as_rule() {
      Rule::stmt => {
        let inner_stmt = p.into_inner().next().unwrap();
        match inner_stmt.as_rule() {
          Rule::let_ => {
            let mut let_inner = inner_stmt.into_inner();
            // let name = let_inner.next().unwrap().as_str().to_string(); // ident
            let bindr = build_expr(let_inner.next().unwrap())?;
            let init = build_expr(let_inner.next().unwrap())?;           // expr
            lets.push((bindr, init));
          }
          Rule::expr_ => {

            let expr_pair = inner_stmt.into_inner().next().unwrap();
            let expr = build_expr(expr_pair)?;
            lets.push((mk_var(""), expr));

          }
          Rule::function_ => {
            let mut f_inner = inner_stmt.into_inner();
            let name = f_inner.next().unwrap().as_str().to_string(); // ident
            let params_pair = f_inner.next().unwrap();                // params
            let params = build_params(params_pair);
            let body_pair = f_inner.next().unwrap();                  // block
            let body_expr = build_block(body_pair)?;
            let init = mk_fn(params, body_expr);
            lets.push((Expr::Var(name), init));
          }
          Rule::if_ => {
            let mut inner = inner_stmt.into_inner();
            let cond = build_expr(inner.next().unwrap())?;
            let then_branch = build_expr(inner.next().unwrap())?;
            let else_branch = build_expr(inner.next().unwrap())?;
            lets.push((mk_var(""), mk_conditional(cond, then_branch, else_branch)));
          }

          Rule::return_ => {
            let expr_pair = inner_stmt.into_inner().next().unwrap();
            let expr = build_expr(expr_pair)?;
            result = Some(Expr::ReturnCmd(Box::new(expr)));
            break;
          }
          _ => unreachable!("unexpected rule inside stmt: {:?}", inner_stmt.as_rule()),
        }
      }
      _ => {}
    }
  }

  let mut body = result.unwrap_or_else(|| Expr::Value(Box::new(Value::Undefined)));

  for (bindr, init) in lets.into_iter().rev() {
    body = mk_let_gen(bindr, init, body);
  }
  Ok(body)
}




// #[test]
// fn test_parse_if_else(){
//   let code = "(()=>{
//     if (c) {
//       return 22;
//     } else {
//       return 44;
//     }
//   })";
//   let exp = "(()=>{
//     let [_ret, _val] = c ? [true, 22] : [true, 44];
//     _ret ? _val : undefined;
//   })";
//   test_parse_equiv(code, exp);
// }



// fn build_block_


// fn build_if_else_rest(pair: pest::iterators::Pair<Rule>, rest: Expr) -> Result<Expr, pest::error::Error<Rule>> {
//   let mut inner = pair.into_inner();
//   let cond = build_expr(inner.next().unwrap())?;
//   let then_branch = build_expr(inner.next().unwrap())?;
//   let else_branch = build_expr(inner.next().unwrap())?;





fn build_object(pair: pest::iterators::Pair<Rule>) -> Result<Expr, pest::error::Error<Rule>> {
  let mut props: Vec<ObjElem> = Vec::new();
  for p in pair.into_inner() { // prop items

    match p.as_rule() {
      Rule::prop=>{
        let mut inner = p.into_inner();
        let k = inner.next().unwrap();
        let key : String = match k.as_rule(){
          Rule::string => {
            let s = k.as_str().to_string();
            s[1..s.len()-1].to_string()
          },
          Rule::ident => {
            k.as_str().to_string()
          },
          _ => unreachable!(),
        };
        // let key = inner.next().unwrap().as_str().to_string();
        let val = build_expr(inner.next().unwrap())?;
        props.push(ObjElem::Expr((key, val)));
      }
      Rule::spread=>{
        let expr = build_expr(p.into_inner().next().unwrap())?;
        props.push(ObjElem::Spread(expr));
      }
      Rule::ident=>{
        // Handle potential prop shorthand if grammar yields a bare ident inside object
        let key = p.as_str().to_string();
        props.push(ObjElem::Expr((key.clone(), Expr::Var(key))));
      }
      _=>unreachable!("unhandled rule in object: {:?}", p.as_rule()),
    }

  }
  Ok(Expr::Object(props))
}
