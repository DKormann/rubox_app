




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
    test_parse("2%2", mk_binop(mk_int(2), "%".into(), mk_int(2)));
    test_parse("(a)=>a+1", mk_fn(vec!["a".into()], mk_binop(mk_var("a"), "+".into(), mk_int(1))));
    test_parse("a(b) + 2", mk_binop(mk_call(mk_var("a"), vec![mk_var("b")]), "+".into(), mk_int(2)));
    test_parse("a.b + 2", mk_binop(mk_access(mk_var("a"), "b".into()), "+".into(), mk_int(2)));
    test_parse("a.b(c) + 2", mk_binop(mk_call(mk_access(mk_var("a"), "b".into()), vec![mk_var("c")]), "+".into(), mk_int(2)));

    test_parse("p && p.c == \"k\"", mk_binop(mk_var("p"), "&&".into(), mk_binop(mk_access(mk_var("p"), "c".into()), "==".into(), mk_string("k".into()))));

    test_parse("p.c == \"k\"", mk_binop(mk_access(mk_var("p"), "c".into()), "==".into(), mk_string("k".into())));
    test_parse("a * b + c", mk_binop(mk_binop(mk_var("a"), "*".into(), mk_var("b")), "+".into(), mk_var("c")));
    test_parse("a + b * c", mk_binop(mk_var("a"), "+".into(), mk_binop(mk_var("b"), "*".into(), mk_var("c"))));

  }



  #[test]
  fn test_parse_object(){
    let code = "{a: 1, b: 2}";
    test_parse(code, mk_object(vec![("a".into(), mk_int(1)), ("b".into(), mk_int(2))]))
  }


  #[test]
  fn test_parse_object_spread(){
    let code = "{a: 1, ...b, c}";
    test_parse(code, Expr::Object(vec![
      ObjElem::Expr(("a".into(), mk_int(1))),
      ObjElem::Spread(mk_var("b")),
      ObjElem::Expr(("c".into(), mk_var("c"))),
    ]));
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
  fn test_parse_let_in_block(){
    let code = "(()=>{ let x = 2; return x; })";
    // test_parse(code, mk_fn(vec![], mk_let("x".into(), mk_int(2), mk_var("x"))));

    test_parse(code,
      mk_fn(vec![],
        mk_let("x".into(), mk_int(2), mk_block(true, mk_var("x")))
      )
    );
  }

  fn test_parse_block_no_return(){
    let code = "(()=>{ let x = 2})";
    test_parse(code,
      mk_fn(vec![],
        mk_let("x".into(), mk_int(2), mk_undefined())
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



  fn try_parse(code:&str){
    parse(code).expect("parse failed");
  }


  fn test_parse_array_length(){
    let code = "[1,2,3].length";
    test_parse(code, mk_access(mk_var("a".into()), "length".into()));
  }


  #[test]
  fn test_parse_array_map(){

    try_parse("map(x=>x*2)");
    let code = "[1,2,3].map(x=>x*2)";
    test_parse(code, mk_call(mk_access(mk_array(vec![mk_int(1), mk_int(2), mk_int(3)]), "map".into()), vec![mk_fn(vec!["x".into()], mk_binop(mk_var("x"), "*".into(), mk_int(2)))]));
  }


  fn test_parse_equiv(a:&str,b:&str){
    let ast_a = parse(a).expect("parse failed");
    let ast_b = parse(b).expect("parse failed");
    assert_eq!(ast_a, ast_b);
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


  // #[test]
  // fn test_parse_if_else2(){
  //   let code = "(()=>{
  //     if (c) {
  //       return 22;
  //     } else {
  //       eff();
  //     }
      
  //   })";

  //   test_parse(code,
  //     mk_fn(vec![],
  //       mk_let_gen(mk_array(vec![mk_var("_ret".into()), mk_var("_val".into())]),
  //         mk_conditional(mk_var("c"),
  //           mk_array(vec![mk_bool(true), mk_int(22)]), 
  //           mk_array(vec![mk_bool(false), mk_call(mk_var("eff"), vec![])]),
  //         ),
  //         mk_conditional(mk_var("_ret"), mk_var("_val"), mk_undefined())
  //       )
  //     )
  //   )
  // }
}