use im::HashMap;

use crate::lang::ast::VRef;

pub mod parser;
pub mod ast;
pub mod runtime;

pub mod readback;



#[derive(Debug)]    
pub enum RuntimeError {
    ParseError(String),
    RuntimeError(String),
}

pub fn runcode(code:&str) -> Result<String, RuntimeError>{
  let ast = parser::parse(code).map_err(|e| RuntimeError::ParseError(e.to_string()))?;
  let (result, logs) = runtime::eval(&ast).map_err(|e| RuntimeError::RuntimeError(e))?;
  Ok((readback::read_back(&result)))
}
