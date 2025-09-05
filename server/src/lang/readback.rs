use crate::lang::ast::{Builtin, Expr, Value, ArrElem, ObjElem};





pub fn read_back(a:&Value)->String{

  match a {
    Value::Int(n)=>n.to_string(),
    Value::Float(n)=>n.to_string(),
    Value::String(s)=>format!("\"{}\"", s.replace("\"", "\\\"")),
    Value::Boolean(b)=>b.to_string(),
    Value::Null=>"null".into(),
    Value::Undefined=>"undefined".into(),
    Value::Array(arr)=>{
      format!("[{}]", arr.iter().map(|i| read_back(i)).collect::<Vec<_>>().join(", "))
    },
    Value::Object(obj)=>{
      format!("{{{}}}", obj.iter().map(|(k,v)| format!("\"{}\": {} ", k, read_back(v))).collect::<Vec<_>>().join(", "))
    },
    Value::Closure(cl)=>{
      "[Closure]".into()
    },
    Value::Builtin(builtin)=>{
      match builtin {
        Builtin::ObjectKeys=>"Object.keys".into(),
        Builtin::Array=>"Array".into(),
        Builtin::Object=>"Object".into(),
        Builtin::ObjectValues=>"Object.values".into(),
        Builtin::ObjectEntries=>"Object.entries".into(),
        Builtin::ObjectKeys=>"Object.keys".into(),
        Builtin::ObjectKeys=>"Object.keys".into(),
        Builtin::ArrayFrom=>"Array.from".into(),
        Builtin::DBGet=>"DB.get".into(),
        Builtin::DBSet=>"DB.set".into(),
        Builtin::DBDelete=>"DB.delete".into(),
        Builtin::DBHas=>"DB.has".into(),
        Builtin::DBUpdate=>"DB.update".into(),
        Builtin::DB=>"DB".into(),
        _ => "[Builtin]".into()
      }
    },
    Value::ReturnValue{val}=>{
      format!("[ReturnValue({:?})]", read_back(val))
    },
    Value::NativeFn(_)=>"<NativeFunction>".into(),
  }
}
    


fn read_back_arr_elems(items:&Vec<ArrElem>)->String{
  items.iter().map(|it|{
    match it{
      ArrElem::Expr(e)=>read_back_expr(e),
      ArrElem::Spread(e)=>format!("...{}", read_back_expr(e)),
    }
  }).collect::<Vec<_>>().join(", ")
}

fn read_back_obj_elems(items:&Vec<ObjElem>)->String{
  items.iter().map(|it|{
    match it{
      ObjElem::Expr((k,v))=>format!("{}: {}", k, read_back_expr(v)),
      ObjElem::Spread(e)=>format!("...{}", read_back_expr(e)),
    }
  }).collect::<Vec<_>>().join(", ")
}

fn read_back_pattern(p:&Expr)->String{
  match p{
    Expr::Var(n)=>n.clone(),
    Expr::Array(items)=>format!("[{}]", read_back_arr_elems(items)),
    Expr::Object(items)=>format!("{{{}}}", read_back_obj_elems(items)),
    _=>read_back_expr(p),
  }
}

pub fn read_back_expr(a:&Expr)->String{
  match a {
    Expr::Value(val)=>read_back(val),
    Expr::Var(name)=>name.clone(),
    Expr::Fn(params, body)=>{
      let params_txt = params.join(", ");
      format!("({}) => {}", params_txt, read_back_expr(body))
    },
    Expr::Call(func, args)=>{
      let args_txt = args.iter().map(|a| read_back_expr(a)).collect::<Vec<_>>().join(", ");
      format!("{}({})", read_back_expr(func), args_txt)
    },
    Expr::Let(bindr, val, body)=>{
      format!("(let {} = {} in {})", read_back_pattern(bindr), read_back_expr(val), read_back_expr(body))
    },
    Expr::Array(arr)=>{
      format!("[{}]", read_back_arr_elems(arr))
    },
    Expr::Object(items)=>{
      format!("{{{}}}", read_back_obj_elems(items))
    },
    Expr::Index(primary, index)=>{
      format!("{}[{}]", read_back_expr(primary), read_back_expr(index))
    },
    Expr::Access(primary, prop)=>{
      format!("{}.{}", read_back_expr(primary), prop)
    },
    Expr::Binop(left, op, right)=>{
      format!("({} {} {})", read_back_expr(left), op, read_back_expr(right))
    },
    Expr::Unop(op, expr)=>{
      format!("({}{})", op, read_back_expr(expr))
    },
    Expr::Conditional(c,t,e)=>{
      format!("({} ? {} : {})", read_back_expr(c), read_back_expr(t), read_back_expr(e))
    },
    Expr::ReturnCmd(e)=>{
      format!("return {}", read_back_expr(e))
    },
  }
}