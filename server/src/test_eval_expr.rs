




#[cfg(test)]
mod tests {
use std::array;
use std::rc::Rc;
use crate::lang::readback;
use crate::lang::readback::read_back;
use crate::lang::runcode;
use crate::lang::runtime;
use crate::lang::runtime::do_eval;
use crate::lang::runtime::env_extend;
use crate::lang::runtime::eval;
use crate::lang::ast::*;
use crate::lang::parser::*;

  // ********** helpers **********


  fn test_parse(code:&str, expect_ast:Expr){
    let ast = parse(code).expect("parse failed");
    assert_eq!(ast, expect_ast);
  }



  fn test_code_equiv(a:&str,b:&str){
    let ast_a = crate::parse(a).expect("parse failed");
    let ast_b = crate::parse(b).expect("parse failed");
    let res_a = runtime::eval(&ast_a).expect("eval failed");
    let res_b = runtime::eval(&ast_b).expect("eval failed");
    assert_eq!(res_a, res_b);
  }


  // ********** parse Expr **********


  // ********** evaluate Expr **********

  #[test]
  fn test_brace_equiv(){
    test_code_equiv("(22)", "22");
  }



  #[test]
  fn arr_index_eval(){
    test_code_equiv("([1,2,3])[2]", "3");
  }


  #[test]
  fn obj_get_eval(){
    test_code_equiv("({a:22}).a", "22");
  }




  // ********** parse Blocks **********


  // let newBoard = arrSet(arrSet(m.board, move.start, null), move.end, { ...piece, type: ptype });


  // let newBoard = arrSet(arrSet(m.board, move.start, null), move.end, { ...piece, type: ptype });

  // ********** evaluate Expr **********

  #[test]
  fn test_parse_binops_eval(){
    test_code_equiv("2+2", "4");
    test_code_equiv("2-2", "0");
    test_code_equiv("2*2", "4");
    test_code_equiv("2/2", "1");
    test_code_equiv("2==2", "true");
    test_code_equiv("2!=2", "false");
    test_code_equiv("2>2", "false");
    test_code_equiv("2<2", "false");
    test_code_equiv("2>=2", "true");
    test_code_equiv("2<=2", "true");
    test_code_equiv("(a)=>a+1", "(a)=>a+1");
  }




  #[test]
  fn arrow_call_eval(){
    test_code_equiv("((x)=>x)(22)", "22");
    test_code_equiv("((x,y)=>y)(1,2)", "2");
    test_code_equiv("((x,y)=>x)(1,2)", "1");
  }




  fn test_block_equiv(a:&str,b:&str){
    let code_a = format!("(()=>{{{}}})()", a);
    let code_b = format!("(()=>{{{}}})()", b);
    test_code_equiv(&code_a, &code_b);
  }


  #[test]
  fn test_destructuring_arr(){
    test_block_equiv("let [x,y] = [1,2]; return x;", "let x = 1; let y = 2; return x;");
    test_block_equiv("let [x,...y] = [1,2,3]; return x;", "let x = 1; let y = [2,3]; return x;");
  }

  #[test]
  fn test_destructuring_obj(){
    test_block_equiv("let {a,b} = {a:1,b:2}; return a;", "let a = 1; let b = 2; return a;");
  }





  
    // test_block_equiv("let {a,...b} = {a:1,b:2,c:3}; return a;", "let a = 1; let b = [2,3]; return a;");

    // test_block_equiv("let {a,b} = {a:1,b:2}; return a;", "let a = 1; let b = 2; return a;");
    // test_block_equiv("let {a,...b} = {a:1,b:2,c:3}; return a;", "let a = 1; let b = [2,3]; return a;");





  #[test]
  fn full_eval_complex(){
    test_code_equiv("(()=>{ let o = {a:22}; return o.a; })()", "22");
    test_code_equiv("(()=>{ let o = {a:22}; let x = o.a; return x; })()", "22");
    test_code_equiv("(()=>{ let o = {f:(x)=>x}; return (o.f)(22); })()", "22");

  }

  #[test]
  fn eval_conditional(){
    test_code_equiv("true ? 22 : 33" , "22");
    test_code_equiv("1 ? 22 : 33" , "22");
    test_code_equiv("0 ? 22 : 33" , "33");
    test_code_equiv("0>1 ? 22 : 33" , "33");
  }




  #[test]
  fn eval_fun_1(){
    let code = "
    (()=>{ let fun = (n)=> n < 2 ? 2 : 3; return fun(1); })()
    ";
    test_code_equiv(code, "2");
  }



  #[test]
  fn eval_fun_rec(){
    let code = "
    (()=>{ let fun = (n)=> n < 2 ? 2 : fun(n-1); return fun(3); })()
    ";
    test_code_equiv(code, "2");
  }


  #[test]
  fn eval_fun_fib(){
    let code = "
    (()=>{ let fib = (n)=> n < 2 ? 1 : fib(n-1) + fib(n-2); return fib(5); })()
    ";
    test_code_equiv(code, "8");
  }



  #[test]
  fn eval_object(){
    // test_code_equiv(a, b);
    let res = runcode("{\"c\":22}").expect("parse error");
    assert_eq!(res, "{\"c\": 22 }".to_string());
  }


  // ********** evaluate Blocks **********




  #[test]
  fn eval_function_decl(){
    test_code_equiv("(()=>{ let add = (a,b)=>{ return a + b; }; return add(2,3); })()", "5");
  }

  #[test]
  fn eval_function_decl_no_return(){
    test_code_equiv("(()=>{ let f = ()=> { let x = 2; x + 3; }; return f(); })()", "undefined");
  }


  #[test]
  fn eval_early_return(){
    test_code_equiv("(()=>{ if (true){ return 22; } return 33; })()", "22");
    test_code_equiv("(()=>{
    if (true) 1 + 2;
    else {
      return 44;
    }
    
    return 33;
    })()", "33");
  }

}

