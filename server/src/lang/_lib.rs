
#![allow(unused)]

pub mod parser;
pub mod runtime;
pub mod tests;
pub mod ast;
mod readback;


use crate::{ast::VRef, parser::parse};


#[derive(Debug)]    
pub enum RuntimeError {
    ParseError(String),
    RuntimeError(String),
}

impl std::fmt::Display for RuntimeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuntimeError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            RuntimeError::RuntimeError(msg) => write!(f, "Runtime error: {}", msg),
        }
    }
}

impl std::error::Error for RuntimeError {}




pub fn runcode_ctx(code:&str, ctx:HashMap<String, VRef> ) -> Result<String, RuntimeError>{
  let ast = parser::parse(code).map_err(|e| RuntimeError::ParseError(e.to_string()))?;
  let result = runtime::eval_ctx(&ast,ctx).map_err(|e| RuntimeError::RuntimeError(e))?;
  Ok(readback::read_back(&result))
}

pub fn runcode(code:&str) -> Result<String, RuntimeError>{
  runcode_ctx(code,HashMap::new())
}

use im::HashMap;


