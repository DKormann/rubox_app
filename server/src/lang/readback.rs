use crate::lang::ast::{Builtin, Value};



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
    
