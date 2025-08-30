import {button, div, h2, p, popup} from "../html"
import { PageComponent } from "../main"
import { Writable } from "../store"
import { AppHandle, DefaultContext, IdString, ServerApp, ServerConnection } from "../userspace"


type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king" | "kingmoved" | "rookmoved" | "pawnmoved" | "pawnmoveddouble"

type Piece = {
  type: PieceType
  color: "white" | "black"
}

type Pos = number;


type Board = (Piece | null)[];

type Match = {
  white: IdString
  black: IdString
  board: Board
  turn: "white" | "black"
  winner: "white" | "black" | "draw" | null
}


type Move = {
  start: Pos
  end: Pos
  promo: PieceType
}


let chessApp : ServerApp <ChessContext> = {

  loadApp : (c:DefaultContext)=>{

    let startBoard : Board = [
      {type:"rook", color:"white"}, {type:"knight", color:"white"}, {type:"bishop", color:"white"}, {type:"queen", color:"white"}, {type:"king", color:"white"}, {type:"bishop", color:"white"}, {type:"knight", color:"white"}, {type:"rook", color:"white"}, null, null,
      {type:"pawn", color:"white"}, {type:"pawn", color:"white"}, {type:"pawn", color:"white"}, {type:"pawn", color:"white"}, {type:"pawn", color:"white"}, {type:"pawn", color:"white"}, {type:"pawn", color:"white"}, {type:"pawn", color:"white"}, null, null,
      null, null, null, null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null, null, null,
      {type:"pawn", color:"black"}, {type:"pawn", color:"black"}, {type:"pawn", color:"black"}, {type:"pawn", color:"black"}, {type:"pawn", color:"black"}, {type:"pawn", color:"black"}, {type:"pawn", color:"black"}, {type:"pawn", color:"black"}, null, null,
      {type:"rook", color:"black"}, {type:"knight", color:"black"}, {type:"bishop", color:"black"}, {type:"queen", color:"black"}, {type:"king", color:"black"}, {type:"bishop", color:"black"}, {type:"knight", color:"black"}, {type:"rook", color:"black"}, null, null,
    ]

    function isPos(pos:Pos):boolean{
      return pos >= 0 && pos < 80 && pos % 10 < 8
    }

    function getPieceAt(board:Board, pos:Pos):Piece|null{
      return board[pos]
    }

    function arrSet<S>(arr:S[], index:number, value:S):S[]{
      return arr.map((v,i)=>i==index?value:v)
    }


    let setPieceAt = (pos:Pos, piece:Piece|null)=>(board:Board):Board=>{
      return arrSet(board, pos, piece)
    }

    function hasKing(board:Board, color:"white"|"black"):boolean{
      return board.filter((p, i)=> p && p.type == "king" && p.color == color).length > 0
    }

    let left = 1
    let right = -left
    function directions(p:Piece):number[]{
      let up = p.color == "white" ? 10 : -10;
      let down = -up;

      return p.type == "pawn" ? [up, up+up] :
        p.type == "pawnmoved" || p.type == "pawnmoveddouble" ? [up] :
        p.type == "knight" ? [up+left*2, up+right*2, down+left*2, down+right*2, up*2+left, up*2+right, down*2+left, down*2+right] :
        p.type == "bishop" ? [up+left, up+right, down+left, down+right] :
        (p.type == "rook" || p.type == "rookmoved")  ? [up, down, left, right] :
        (p.type == "king" || p.type == "queen" || p.type == "kingmoved") ? [up, down, left, right, up+left, up+right, down+left, down+right] :
        []
    }

    function getLegalMoves(board:Board, pos:Pos):Pos[]{
      let piece = getPieceAt(board, pos)
      if (!piece) {return []}
      if (piece.type == "rook" || piece.type == "bishop" || piece.type == "queen" || piece.type == "rookmoved"){

        let getRay = (pos:Pos, dir:number):Pos[]=>{
          let pp = pos + dir
          if (!isPos(pp)) {return []}
          let target = getPieceAt(board, pp)
          if (target) {
            if (target.color == piece.color) {return []}
            return [pp]
          }
          return [pp, ...getRay(pp, dir)]
        }
        return directions(piece).reduce((acc, dir)=>{
          return [...acc, ...getRay(pos, dir)]
        }, [])
      }
      if (piece.type == "pawn" || piece.type == "pawnmoved" || piece.type == "pawnmoveddouble"){
        let moves =  directions(piece).map((d)=>pos+d).filter((p)=>isPos(p) && getPieceAt(board, p) == null)

        let up = (piece.color == "white" ? 10 : -10);

        let hits = [left,right]
        .map((d) => pos + d + up)
        .filter((t) => {
          let target = getPieceAt(board,t);
          return target && target.color != piece.color
        })

        console.log({hits})

        let passants = [left,right]
        .map((d) => pos + d)
        .filter((t) => {
          let target = getPieceAt(board,t);
          if (target && target.type == "pawnmoveddouble" && target.color != piece.color) {return true}
          return false
        })
        .map((t)=>t+up)

        return [...moves, ...passants, ...hits]
      }
      return directions(piece).map((d)=>pos+d).filter((p)=>{
        let target = getPieceAt(board, p)
        return !target || target.color != piece.color
      })
    }

    function makeMove(m:Match, move:Move):[string, Match]{

      

      let piece = getPieceAt(m.board, move.start)
      if (!piece) {return ["no piece at start", m]}
      if (m.winner != null) {return ["game over", m]}
      if (piece.color != m.turn) {return ["not your turn", m]}
      
      let options = getLegalMoves(m.board, move.start)
      console.log({options})
      let dist = move.end - move.start
      let npBoard = m.board.map((p)=> p && p.type == "pawnmoveddouble" ? {...p, type: "pawnmoved"} : p)
      let ptype = (piece.type == "pawn" || piece.type == "pawnmoveddouble") ?
          ((dist == 20 || dist == -20) ? "pawnmoveddouble" : "pawnmoved") :
        (piece.type == "king") ? "kingmoved" :
        (piece.type == "rook") ? "rookmoved" :
        piece.type
      
      

      let newBoard = arrSet(arrSet(npBoard, move.start, null), move.end, {...piece, type:ptype}) as Board
      if  (!options.includes(move.end)) {return ["Invalid move", m]}


      let resMatch: Match = {
        ...m,
        board: newBoard,
        turn: m.turn == "white" ? "black" : "white",
        winner: null,
      }

      

      if (ptype == "pawnmoved"){
        if (dist % 10 != 0){
          let passant = move.end % 10 + Math.floor(move.start / 10) * 10
          let target = getPieceAt(resMatch.board, passant)
          console.log({target, passant})
          let pboard = arrSet(resMatch.board, passant, null)
          if (target && target.type == "pawnmoveddouble" && target.color != piece.color) {
            return ["", {...resMatch, board: pboard}]
          }

        }        
      }
      return ["", resMatch]
    }
    
    return {
      startBoard,
      getLegalMoves,
      makeMove,
    } as ChessContext
  },
  api: {

    getstartBoard: (c, arg)=>{
      return c.startBoard
    },

    getMoves: (c, arg)=>{
      return c.getLegalMoves(c.startBoard,10)
    },
    mkMove: (c, arg:[Match, Move])=>{
      return c.makeMove(arg[0], arg[1])
    },

    openGame: (c, arg:null)=>{
      let m : Match = {
        board: c.startBoard,
        turn: "white",
        winner: null,
        white: c.self,
        black: c.other,
      }
      
      c.DB.set(true, "game", m)
      c.DB.set(true, "playLocation", c.self)
      let invs = c.DB.get(false, "invitations")  as IdString[]
      c.DB.set(false, "invitations", [...invs, m])
    },

    getLoc: (c, arg:null)=>{
      return c.DB.get(false, "playLocation")
    },

    getGame: (c, arg:null)=>{
      return c.DB.get(false, "game")
    },

    submitMove: (c, arg:Move)=>{
      let game = c.DB.get(false, "game") as Match
      if (!game) {return {error:"no game"}}
      if (game.white != c.self && game.black != c.self) {return {error:"not your game"}}
      let mycolor = game.white == c.self ? "white" : "black"
      if (game.turn != mycolor) {return {error:"not your turn"}}

      let [error, next] = c.makeMove(game, arg)
      if (error) {return {error, next}}
      c.DB.set(false, "game", next)
      return {error, next}
    },
      

    getInvitations: (c, arg:null)=>{
      return c.DB.get(true, "invitations")  as IdString[]
    },

    acceptInvitation: (c, arg:IdString)=>{
      let otherloc = c.DB.get(false, "playLocation")
      if (otherloc != c.self) {
        return "invitation expired"
      }
      c.DB.set(true, "playLocation", c.other)
      return "ok"
    },
  }
}


type ChessContext = {
  startBoard: Board
  makeMove: (m:Match, move:Move) => [string, Match]
  getLegalMoves: (board:Board, pos:Pos) => Pos[]
}

let pieceImages = {
  "pawn": "p",
  "knight": "N",
  "bishop": "B",
  "rook": "R",
  "queen": "Q",
  "king": "K",
  "kingmoved" :"K",
  "rookmoved": "R",
  "pawnmoved": "p",
  "pawnmoveddouble": "p"
}

let boardSize = (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight) * 0.6
let chessBoard = div({class:"chessboard",style:{
  backgroundColor: "#f0d9b5",
  width: boardSize + "px",
  height: boardSize + "px",
  margin: "auto",
  position: "relative",
  cursor: "pointer",
}})



let focuspos = 0

let opponentId = new Writable<IdString|null>(null);

let displayBoard = (m:Match, app:AppHandle<ChessContext>)=>{

  chessBoard.innerHTML = ""


  chessBoard.appendChild(div(m.board.map((p, n)=>{

    let x = n % 10
    let y = Math.floor(n / 10)

    let square = div({style:{
      width: boardSize / 8 + "px",
      height: boardSize / 8 + "px",
      "background-color": (x + y) % 2 == 0 ?
        (focuspos == n ? "#c5a8a3" : "#b58863") :
        (focuspos == n ? "#c5a8a3" : "#a9a0a0"),
      left: x * boardSize / 8 + "px",
      bottom: y * boardSize / 8 + "px",
      position: "absolute",
    },

    
    onclick: async ()=>{
      let move = {
        start: focuspos,
        end: n,
        promo: null
      };
      let [error, next]: [string, Match] = await app.call(opponentId.get(), chessCtx.api.mkMove, [m, move])
      focuspos = focuspos == n ? null : n
      displayBoard(error ? m : next, app)
    }})

    let piece = m.board[n]

    if (piece){
      let pieceElement = div( pieceImages[piece.type], {
        style:{
          width: boardSize / 8 + "px",
          height: boardSize / 8 + "px",
          position: "absolute",
          color: piece.color === "white" ? "white" : "black",
          "font-weight": "bold",
          "font-size": boardSize / 8 + "px",
        }
      })
      square.appendChild(pieceElement)
    }

    return x > 7 ? div() : square

  })))
}



export let chessView : PageComponent = (conn:ServerConnection) => {

  let ctx = chessApp.loadApp(undefined);

  let el = div({class:"chess-container"})

  let m : Match = {

    white: conn.identity,
    black: null,

    board: ctx.startBoard,
    turn: "white",
    winner: null
  }


  conn.handle(chessCtx).then((app)=>{


    opponentId.set(conn.identity);

    app.call(conn.identity, chessCtx.api.getstartBoard, null).then((m)=>{
      let b:Match = {
        board: m,
        turn: "white",
        winner: null
      }
      displayBoard(b, app)

    })

    // call(conn.identity, chessCtx.api.mkMove, [m , {start: 10, end: 20, promo: null}]).then((resp)=>{
    //   console.log("resp", resp)
    //   let [err,m] = resp
    //   console.log(err,m)
    //   displayBoard(m)
    // })

    el.appendChild(div(

      h2("chess game"),
      p("opponent: ", opponent),
      chessBoard,
      p(),
      button("join game", {
        onclick:()=>{
          popup(
            div(
              h2("create a game"),
              users().then(us=>us.map(u=>callChat(u, msgApp.api.getname, null).then(nm=>
                button(nm)
              )))
            )
          )
        }
      })
    ))
  })




  // displayBoard(m)

  
  let el = div({class:"chess-container"})
  el.appendChild(chessBoard)
  return el
}

