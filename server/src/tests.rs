




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

  #[test]
  fn test_parse_str_expr(){
    let code = "'22'";
    test_parse(code, mk_string("22".into()));
  }
  
  #[test]
  fn test_parse_number_expr(){
    test_parse("2", mk_int(2));
  }

  // ********** evaluate Expr **********

  #[test]
  fn test_brace_equiv(){
    test_code_equiv("(22)", "22");
  }

  #[test]
  fn test_fn_def(){
    let code = "((x)=>x)";
    test_parse(code, mk_fn(vec!["x".into()], mk_var("x")));
  }

  #[test]
  fn test_parse_call(){
    let code = "fn(22)";
    test_parse(code, mk_call(mk_var("fn"), vec![mk_int(22)]));
  }

  #[test]
  fn test_parse_binops(){
    test_parse("2+2", mk_binop(mk_int(2), "+".into(), mk_int(2)));
    test_parse("2-2", mk_binop(mk_int(2), "-".into(), mk_int(2)));
    test_parse("2*2", mk_binop(mk_int(2), "*".into(), mk_int(2)));
    test_parse("2/2", mk_binop(mk_int(2), "/".into(), mk_int(2)));
    test_parse("2==2", mk_binop(mk_int(2), "==".into(), mk_int(2)));
    test_parse("2!=2", mk_binop(mk_int(2), "!=".into(), mk_int(2)));
    test_parse("2>2", mk_binop(mk_int(2), ">".into(), mk_int(2)));
    test_parse("2<2", mk_binop(mk_int(2), "<".into(), mk_int(2)));
    test_parse("2>=2", mk_binop(mk_int(2), ">=".into(), mk_int(2)));
    test_parse("2<=2", mk_binop(mk_int(2), "<=".into(), mk_int(2)));
    test_parse("(a)=>a+1", mk_fn(vec!["a".into()], mk_binop(mk_var("a"), "+".into(), mk_int(1))));

    test_parse("a(b) + 2", mk_binop(mk_call(mk_var("a"), vec![mk_var("b")]), "+".into(), mk_int(2)));
    test_parse("a.b + 2", mk_binop(mk_access(mk_var("a"), "b".into()), "+".into(), mk_int(2)));
  }



  #[test]
  fn test_parse_array(){

    let code = "[1,2,3]";
    test_parse(code, mk_array(vec![mk_int(1), mk_int(2), mk_int(3)]));

    let code = "[...a,b,...c]";
    test_parse(code,
      Expr::Array(
      vec![
        ArrElem::Spread(mk_var("a")),
        ArrElem::Expr(mk_var("b")),
        ArrElem::Spread(mk_var("c")),
      ]
    ));
  }



  #[test]
  fn test_parse_object(){
    let code = "{a: 1, b: 2}";
    test_parse(code, mk_object(vec![("a".into(), mk_int(1)), ("b".into(), mk_int(2))]))
  }


  #[test]
  fn test_parse_index(){
    let code = "a[0]";
    test_parse(code, mk_index(mk_var("a"), mk_int(0)));
  }

  #[test]
  fn test_parse_access(){
    let code = "a.b";
    test_parse(code, mk_access(mk_var("a"), "b".into()));

    let code = "a.b(22)";
    test_parse(code, mk_call(mk_access(mk_var("a".into()), "b".into()), vec![mk_int(22)]));
  }

  #[test]
  fn test_parse_access_chain(){
    let code = "a.b.c";
    test_parse(code, mk_access(mk_access(mk_var("a".into()), "b".into()), "c".into()));

    let code = "a.b.c(22)[3].d";
    test_parse(code, mk_access(mk_index(mk_call(mk_access(mk_access(mk_var("a".into()), "b".into()), "c".into()), vec![mk_int(22)]), mk_int(3)), "d".into()));

    let code = "(((a.b).c)(22))[3].d";
    test_parse(code, mk_access(mk_index(mk_call(mk_access(mk_access(mk_var("a".into()), "b".into()), "c".into()), vec![mk_int(22)]), mk_int(3)), "d".into()));
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
  #[test]
  fn test_parse_let_in_block(){
    let code = "(()=>{ let x = 2; return x; })";
    // test_parse(code, mk_fn(vec![], mk_let("x".into(), mk_int(2), mk_var("x"))));

    test_parse(code,
      mk_fn(vec![],
        mk_let("x".into(), mk_int(2), mk_var("x"))
      )
    );
  }




  #[test]
  fn test_parse_let_in_block_2(){
    let code = "(()=>{ let x = 2; DBSet(x); return x; })";

    test_parse(code,
      mk_fn(vec![],
        mk_let("x".into(), mk_int(2), 
          mk_let("".into(), mk_call(mk_var("DBSet"), vec![mk_var("x")]), mk_var("x"))
      ))
    );
  }



  #[test]
  fn test_parse_let_in_block_3(){
    let code = "(()=>{
      let x = 2;
      DBSet(x);
      function f() { return 3; }
      return x; })";

    test_parse(code,
      mk_fn(vec![],
        // todo!()
        mk_let_chain(vec![
            ("x".into(), mk_int(2)),
            ("".into(), mk_call(mk_var("DBSet"), vec![mk_var("x")])),
            ("f".into(), mk_fn(vec![], mk_int(3))),
          ], 
          mk_var("x".into()))
      )
    );
  }



  #[test]
  fn test_parse_let_in_block_4(){
    let code = "(()=>{ let o = {f:(x)=>x}; return (o.f)(22); })()";
    test_parse(code, mk_call(
    mk_fn(vec![],
      mk_let_chain(vec![
        ("o".into(), mk_object(vec![("f".into(), mk_fn(vec!["x".into()], mk_var("x")))])),
      ],
      mk_call(mk_access(mk_var("o".into()),"f".into()), vec![mk_int(22)])
      ),
    ),
    vec![]));
  }


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

}

