import {div} from "../html"
import { PageComponent } from "../main"
import { DefaultContext, ServerApp, ServerConnection } from "../userspace"


type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king" | "kingmoved" | "rookmoved" | "pawnmoved" | "pawnmoveddouble"

type Piece = {
  type: PieceType
  color: "white" | "black"
}

type Pos = number;


type Board = (Piece | null)[]; // 80x represents whole board

type Match = {
  board: Board
  turn: "white" | "black"
  winner: "white" | "black" | "draw" | null
}


type Move = {
  start: Pos
  end: Pos
  promo: PieceType
}


let chessCtx : ServerApp <ChessContext> = {

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

    function directions(p:Piece):number[]{
      let up = p.color == "white" ? 10 : -10;
      let down = -up;
      let left = 1
      let right = -left



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
      return piece ? directions(piece).map((d)=>pos+d).filter((p)=>isPos(p) && getPieceAt(board, p) == null) : []
    }


    function makeMove(m:Match, move:Move):[string, Match]{

      let piece = getPieceAt(m.board, move.start)
      if (!piece) {return ["no piece at start", m]}
      if (m.winner != null) {return ["game over", m]}
      if (piece.color != m.turn) {return ["not your turn", m]}
      
      let options = getLegalMoves(m.board, move.start)
      let dist = move.end - move.start

      let ptype = (piece.type == "pawn") ?
          ((dist == 2 || dist == -2) ? "pawnmoveddouble" : "pawnmoved") :
        (piece.type == "king") ? "kingmoved" :
        (piece.type == "rook") ? "rookmoved" :
        piece.type

      let newBoard = arrSet(arrSet(m.board, move.start, null), move.end, {...piece, type:ptype})


      return (!options.includes(move.end)) ? ["Invalid move", m] : ["", {
        board: newBoard,
        turn: m.turn == "white" ? "black" : "white",
        winner: null
      }]
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
    }
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

let displayBoard = (m:Match)=>{


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
    onclick: ()=>{
      let [error, next] = (focuspos == null || focuspos == n) ? [null, m] : chessCtx.loadApp(undefined).makeMove(m, {
        start: focuspos,
        end: n,
        promo: null
      })
      focuspos = focuspos == n ? null : n
      console.log(error)
      displayBoard(error ? m : next)
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

  let ctx = chessCtx.loadApp(undefined);


  let m : Match = {
    board: ctx.startBoard,
    turn: "white",
    winner: null
  }


  conn.handle(chessCtx).then(({call, users})=>{
    console.log(call)

    call(conn.identity, chessCtx.api.getstartBoard, null).then((m)=>{
      let b:Match = {
        board: m,
        turn: "white",
        winner: null
      }
      displayBoard(b)

    })

    call(conn.identity, chessCtx.api.mkMove, [m , {start: 20, end: 30, promo: null}]).then(([err,m])=>{
      console.log(err,m)
      displayBoard(m)
    })

  })




  displayBoard(m)

  
  let el = div({class:"chess-container"})
  el.appendChild(chessBoard)
  return el
}

