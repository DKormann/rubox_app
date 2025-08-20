
use std::rc::Rc;
use std::cell::RefCell;

use im::HashMap;


/// The language syntax ---------------------------------------------------------
#[derive(Clone, Debug, PartialEq)]
pub enum Expr {
  Value(Box<Value>),
  Var(String),
  Fn(Vec<String>, Box<Expr>),
  Call(Box<Expr>, Vec<Expr>),
  Let(Box<Expr>, Box<Expr>, Box<Expr>),
  Array(Vec<ArrElem>),
  Object(Vec<ObjElem>),
  Index(Box<Expr>, Box<Expr>),
  Access(Box<Expr>, String),
  Binop(Box<Expr>, String, Box<Expr>),
  Unop(String, Box<Expr>),
  Conditional(Box<Expr>, Box<Expr>, Box<Expr>),
  ReturnCmd(Box<Expr>), // used for if else that can produce a return
}



#[derive(Clone, Debug, PartialEq)]
pub enum ArrElem{
  Expr(Expr),
  Spread(Expr)
}

#[derive(Clone, Debug, PartialEq)]
pub enum ObjElem{
  Expr((String,Expr)),
  Spread(Expr)
}

/// Runtime values --------------------------------------------------------------
#[derive(Clone)]
pub enum Value {
  Int(i32),
  Closure(Closure),
  Float(f64),
  Array(Vec<Rc<Value>>),
  Object(HashMap<String, Rc<Value>>),
  String(String),
  Boolean(bool),
  Null,
  Undefined,
  Builtin(Builtin),
  NativeFn(String),
  ReturnValue{val:VRef},
}
use std::fmt;

impl fmt::Debug for Value{
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    use Value::*;
    match self {
      Int(n) => write!(f, "Int({})", n),
      Float(n) => write!(f, "Float({})", n),
      String(s) => write!(f, "String({})", s),
      Boolean(b) => write!(f, "Boolean({})", b),
      Null => write!(f, "Null"),
      Undefined => write!(f, "Undefined"),
      Array(arr) => write!(f, "Array({:?})", arr),
      Object(obj) => write!(f, "Object({:?})", obj),
      Closure(cl) => write!(f, "Closure({:?})", cl),
      Builtin(builtin) => write!(f, "Builtin({:?})", builtin),
      NativeFn(func) => write!(f, "NativeFn"),
      ReturnValue{val} => write!(f, "ReturnValue({:?})", val),

    }
  }
}


impl PartialEq for Value{
  fn eq(&self, other: &Self) -> bool {
    
    use Value::*;
    match (self, other) {
      (Int(n1), Int(n2)) => n1 == n2,
      (Float(n1), Float(n2)) => n1 == n2,
      (String(s1), String(s2)) => s1 == s2,
      (Boolean(b1), Boolean(b2)) => b1 == b2,
      (Null, Null) => true,
      (Undefined, Undefined) => true,
      (Array(arr1), Array(arr2)) => arr1 == arr2,
      (Object(obj1), Object(obj2)) => obj1 == obj2,
      (Closure(cl1), Closure(cl2)) => cl1 == cl2,
      (Builtin(builtin1), Builtin(builtin2)) => builtin1 == builtin2,

      (NativeFn(func1), NativeFn(func2)) => func1==func2,
      _ => false,
    }
  }
}
  


pub trait NativeFunction {
  fn call(&self, args: Vec<Value>) -> Result<Value, String>;
}

#[derive(Clone, Debug, PartialEq)]
pub enum Builtin {
  Object,
  ObjectKeys,
  ObjectValues,
  ObjectEntries,
  Array,
  ArrayFrom,
  ArrMethod(Vec<Rc<Value>>, Method),
  DB,
  DBGet,
  DBSet,
  DBHas,
  DBDelete,
  DBUpdate,
  Math,
  MathAbs,
  MathCeil,
  MathFloor,
  MathRound,
  MathMax,
  MathMin,
  MathRandom,
  ConsoleLog,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Method {
  ArrayMap,
  ArrayConcat,
  ArrayFilter,
  ArrayReduce,
  ArrayFind,
  ArrayFindIndex,
  ArrayIncludes,
  ArrayIndexOf,
  ArrayLastIndexOf,
  ArrayJoin,
  ArraySlice,
}


impl From<Value> for Expr {
  fn from(val: Value) -> Self { Expr::Value(Box::new(val)) }
}

impl From<&Value> for Expr {
  fn from(val: &Value) -> Self { Expr::Value(Box::new(val.clone())) }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Closure {
    pub params: Vec<String>,
    pub body: Expr,
    pub env: EnvRef,            // lexical environment captured at definition time
}

/// Environment -----------------------------------------------------------------
#[derive(Clone, Debug, PartialEq)]
pub struct EnvData {
    pub bindings: RefCell<HashMap<String, VRef>>, // mutable frame
    pub parent:   Option<EnvRef>,
}
pub type EnvRef = Rc<EnvData>;
pub type VRef   = Rc<Value>;

fn v(val: Value) -> VRef {
    Rc::new(val)
}




impl From<i32> for Value {
  fn from(n: i32) -> Self { Value::Int(n) }
}
impl From<f64> for Value {
  fn from(n: f64) -> Self { Value::Float(n) }
}
impl From<bool> for Value {
  fn from(b: bool) -> Self { Value::Boolean(b) }
}
impl From<String> for Value {
  fn from(s: String) -> Self { Value::String(s) }
}
impl From<&str> for Value {
  fn from(s: &str) -> Self { Value::String(s.into()) }
}

// Collections
impl From<Vec<Rc<Value>>> for Value {
  fn from(v: Vec<Rc<Value>>) -> Self { Value::Array(v) }
}
impl From<Vec<Value>> for Value {
  fn from(v: Vec<Value>) -> Self { Value::Array(v.into_iter().map(Rc::new).collect()) }
}
impl From<im::HashMap<String, Rc<Value>>> for Value {
  fn from(m: im::HashMap<String, Rc<Value>>) -> Self { Value::Object(m) }
}




use std::convert::TryFrom;

#[derive(Debug)]
pub struct ValueCastError(&'static str);

impl TryFrom<&Value> for i32 {
  type Error = ValueCastError;
  fn try_from(v: &Value) -> Result<Self, Self::Error> {
    match v { Value::Int(n) => Ok(*n), _ => Err(ValueCastError("expected Int")) }
  }
}
impl TryFrom<&Value> for f64 {
  type Error = ValueCastError;
  fn try_from(v: &Value) -> Result<Self, Self::Error> {
    match v { Value::Float(n) => Ok(*n), _ => Err(ValueCastError("expected Float")) }
  }
}
impl TryFrom<&Value> for bool {
  type Error = ValueCastError;
  fn try_from(v: &Value) -> Result<Self, Self::Error> {
    match v { Value::Boolean(b) => Ok(*b), _ => Err(ValueCastError("expected Boolean")) }
  }
}
impl TryFrom<&Value> for String {
  type Error = ValueCastError;
  fn try_from(v: &Value) -> Result<Self, Self::Error> {
    match v { Value::String(s) => Ok(s.clone()), _ => Err(ValueCastError("expected String")) }
  }
}
impl TryFrom<&Value> for Vec<Rc<Value>> {
  type Error = ValueCastError;
  fn try_from(v: &Value) -> Result<Self, Self::Error> {
    match v { Value::Array(items) => Ok(items.clone()), _ => Err(ValueCastError("expected Array")) }
  }
}
impl TryFrom<&Value> for im::HashMap<String, Rc<Value>> {
  type Error = ValueCastError;
  fn try_from(v: &Value) -> Result<Self, Self::Error> {
    match v { Value::Object(m) => Ok(m.clone()), _ => Err(ValueCastError("expected Object")) }
  }
}


impl From<i32> for Expr { fn from(n: i32) -> Self { Value::from(n).into() } }
impl From<f64> for Expr { fn from(n: f64) -> Self { Value::from(n).into() } }
impl From<bool> for Expr { fn from(b: bool) -> Self { Value::from(b).into() } }
impl From<&str> for Expr { fn from(s: &str) -> Self { Value::from(s).into() } }
impl From<String> for Expr { fn from(s: String) -> Self { Value::from(s).into() } }

pub fn mk_var(s: &'static str) -> Expr {
  Expr::Var(s.into())
}
pub fn mk_int(n: i32) -> Expr {
  Expr::Value(Box::new(Value::Int(n)))
}

pub fn mk_bool(b: bool) -> Expr {
  Expr::Value(Box::new(Value::Boolean(b)))
}

pub fn mk_null() -> Expr {
  Expr::Value(Box::new(Value::Null))
}

pub fn mk_undefined() -> Expr {
  Expr::Value(Box::new(Value::Undefined))
}

#[allow(dead_code)]
pub fn mk_fn(params: Vec<String>, body: Expr) -> Expr {
  Expr::Fn(
    params.into_iter().map(|s| s.into()).collect(),
    Box::new(body),
  )
}

#[allow(dead_code)]
pub fn mk_call(func: Expr, args: Vec<Expr>) -> Expr {
  Expr::Call(Box::new(func), args)

}



pub fn mk_string(s: String) -> Expr {
  Expr::Value(Box::new(Value::String(s)))
}

pub fn mk_let(name: String, value: Expr, body: Expr) -> Expr {
  Expr::Let(Box::new(Expr::Var(name)), Box::new(value), Box::new(body))
}

pub fn mk_let_gen(bindr: Expr, value: Expr, body: Expr) -> Expr {
  Expr::Let(Box::new(bindr), Box::new(value), Box::new(body))
}


pub fn mk_array(elems: Vec<Expr>) -> Expr {
  Expr::Array(elems.into_iter().map(|e| ArrElem::Expr(e)).collect())
}

pub fn mk_array_spread(elem: Expr) -> ArrElem {
  ArrElem::Spread(elem)
}

pub fn mk_index(primary: Expr, index: Expr) -> Expr {
  Expr::Index(Box::new(primary), Box::new(index))
}

pub fn mk_access(primary: Expr, property: String) -> Expr {
  Expr::Access(Box::new(primary), property)
}

pub fn mk_binop(left: Expr, op: String, right: Expr) -> Expr {
  Expr::Binop(Box::new(left), op, Box::new(right))
}

pub fn mk_unop(op: String, expr: Expr) -> Expr {
  Expr::Unop(op, Box::new(expr))
}

pub fn mk_conditional(cond: Expr, then_branch: Expr, else_branch: Expr) -> Expr {
  Expr::Conditional(Box::new(cond), Box::new(then_branch), Box::new(else_branch))
}

pub fn mk_object(elems: Vec<(String, Expr)>) -> Expr {
  Expr::Object(elems.into_iter().map(|(k,v)| ObjElem::Expr((k,v))).collect())
}


pub fn mk_native_fn(fname: String) -> Expr {
  Expr::Value(Box::new(Value::NativeFn(fname)))
}

pub fn mk_builtin(builtin: Builtin) -> Expr {
  Expr::Value(Box::new(Value::Builtin(builtin)))
}

pub fn mk_let_chain(lets: Vec<(String, Expr)>, result: Expr) -> Expr {
  let mut body = result;
  for (name, value) in lets.into_iter().rev() {
    body = mk_let(name, value, body);
  }
  body
}

pub fn mk_block(ret: bool, val: Expr) -> Expr {
  Expr::ReturnCmd(Box::new(Expr::ReturnCmd(Box::new(val))))
}