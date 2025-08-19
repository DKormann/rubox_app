

import { button, div, h1, h2, p, popup } from "../html"
import { ServerApp, DBRow, DBTable, DefaultContext, connectServer, IdString, ServerConnection } from "../userspace"
import { Serial } from "../userspace"

import { Writable } from "../store"
import { PageComponent } from "../main"



type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king" | "kingmoved" | "rookmoved" | "pawnmoved" | "pawnmoveddouble"

type ChessPiece = {
  type: PieceType
  color: "white" | "black"
}

type Ps = ChessPiece| null
type Row = [Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps]
type Board = [Row, Row, Row, Row, Row, Row, Row, Row]


type Match = {
  white: IdString,
  black: IdString,
  board: Board,
  turn: "white" | "black",
  winner : "white" | "black" | "draw" | null
}

type Move = {
  start: Pos
  end: Pos
  promo: PieceType
}


let chessCtx = (c:DefaultContext):ChessContext=>{

  let startBoard:Board = [
    [{type: "rook", color: "white"}, {type: "knight", color: "white"}, {type: "bishop", color: "white"}, {type: "queen", color: "white"}, {type: "king", color: "white"}, {type: "bishop", color: "white"}, {type: "knight", color: "white"}, {type: "rook", color: "white"}],
    [{type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [{type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}],
    [{type: "rook", color: "black"}, {type: "knight", color: "black"}, {type: "bishop", color: "black"}, {type: "queen", color: "black"}, {type: "king", color: "black"}, {type: "bishop", color: "black"}, {type: "knight", color: "black"}, {type: "rook", color: "black"}]
  ]

  function posVec(pos:Pos):[number,number]{
    return [pos % 10, Math.floor(pos / 10)]
  }

  function vecPos(vec:[number,number]):Pos{
    return vec[0] + (vec[1] * 10)
  }

  function isPos(pos:Pos):boolean{
    let [x,y] = posVec(pos)
    return x >= 0 && x < 8 && y >= 0 && y < 8
  }


  function getPieceAt(board:Board, pos:Pos):ChessPiece|null{
    let [x,y] = posVec(pos)
    return board[y][x]
  }
  
  function arrSet<S>(arr:S[], index:number, value:S):S[]{
    return arr.map((v,i)=>i == index ? value : v)
  }

  function setPieceAt(board:Board, pos:Pos, piece:ChessPiece|null):Board{
    let [x,y] = posVec(pos)
    return arrSet(board, y, arrSet(board[y], x, piece)) as Board
  }
  
  function hasKing(board:Board, color:"white"|"black"):boolean{
    return board.filter((r,i)=>r.filter((p,j)=>(p && p.type == "king")).length > 0).length > 0
  }

  
  function directions(p:ChessPiece):number[]{
    let rook = [10,-10,1,-1]
    let bish = [11, -11, 9, -9]


    return p.type.startsWith("pawn") ? (p.color == "white" ? [10,20] : [-10,-20]) :
      p.type.startsWith("knight") ? [12,8,21,19,-12,8,-21,-19] :
      p.type.startsWith("bishop") ? bish :
      p.type.startsWith("rook") ? rook :
      p.type.startsWith("queen")||p.type.startsWith("king") ? bish.concat(rook) :
      []
  }

  function posadd(start:Pos, vec:[number, number]):Pos{
    let [x,y] = posVec(start)
    let [dx,dy] = vec
    return vecPos([x+dx,y+dy])
  }

  function getPossibleMoves(board:Board, pos:Pos):Pos[]{

    let piece = getPieceAt(board, pos)


    if (!piece) return []
    let res : Pos[] = []

    let ty = piece.type
    let dirs = directions(piece)
    if (ty.startsWith("pawn")){
      res = dirs
      .map((vec)=>pos+vec)
      .filter(isPos)
      .filter((p)=>getPieceAt(board,p) == null)
      let hity = piece.color == "white" ? 1 : -1


      res = res.concat(
        [1,-1]
        .map(x=>posadd(pos,[x,hity]))
        .filter(isPos)
        .filter((pos)=>{
          let target = getPieceAt(board,pos)
          if (target) return target.color != piece.color
          else{
            target = getPieceAt(board, pos - (hity * 10))
            return target && target.color != piece.color && target.type == "pawnmoveddouble"
          }
        })
      )
    }else{
      let ranged = ty.startsWith("rook") || ty.startsWith("bishop") || ty.startsWith("queen")
      for (let dir of dirs){
        let pp = pos


        
        // while(true){
        //   pp = pp+dir
        //   if (!isPos(pp)) break
        //   let tar = getPieceAt(board,pp)
        //   if (tar){
        //     if (piece.color !== tar.color) res.push(pp)
        //     break
        //   }
        //   res.push(pp)
        //   if (!ranged) break
        // }



        function check(pp:Pos){
          
          let nextpp = pp + dir
          let tar = getPieceAt(board,nextpp)          

        }

        

      }
      if (ty=="king"){
        if (getPieceAt(board, pos +1) == null && getPieceAt(board,pos + 2) == null && getPieceAt(board, pos + 3)?.type == "rook") res.push(pos +2)
        if (getPieceAt(board, pos -1) == null && getPieceAt(board,pos - 2) == null && getPieceAt(board, pos - 4)?.type == "rook") res.push(pos -2)
      }
    }
    return res
  }

  function getLegalMoves(board:Board, pos:Pos):Pos[]{

    return getPossibleMoves(board, pos)

  }

  function isInCheck(m:Match, color:"white"|"black"):boolean{
    return false
  }


  function makeMove(m:Match, move:Move):[string, Match]{

    let mover = getPieceAt(m.board, move.start)
    if (!mover) return ["no piece at start", m]
    if (m.winner != null) return ["game over", m]
    if (!mover || mover.color !== m.turn) return ["not your turn", m]
    let legalmoves = getLegalMoves(m.board, move.start)
    if (!legalmoves.includes(move.end)) return ["illegal move", m]

    if (mover.type == "pawn" || mover.type == "king" || mover.type == "rook") mover.type += "moved"
    if (mover.type == "pawnmoved" && Math.abs(move.end - move.start) == 20) mover.type = "pawnmoveddouble" 


    let sendcond = (mover.type.startsWith("pawn")) && (move.start%10 != move.end%10) && (getPieceAt(m.board, move.end) == null)
    let board: Board = sendcond ? setPieceAt(m.board, vecPos([move.end%10, Math.floor(move.start/10)]), null) : m.board;


    let dist = move.end - move.start;

    let board2 = (
      mover.type.startsWith("king")
      ? ( dist == 2 ? setPieceAt(setPieceAt(board, move.end + 1, {...mover, type:"rookmoved"}), move.end - 2, null)
      : (dist == -2 ? setPieceAt(setPieceAt(board, move.end - 1, {...mover, type:"rookmoved"}), move.end + 1, null) : board))
      : board
    );


    let y = Math.floor(move.end/10)

    let board4 = setPieceAt(setPieceAt(board2, move.end, (mover.type.startsWith("pawn") && (y == 0 || y == 7))? {...mover, type: move.promo} : mover), move.start, null)

    return ["", {
      ...m,
      board: board4,
      turn: m.turn == "white" ? "black" : "white",
      winner: hasKing(board4,m.turn) == null ? (m.turn == "white" ? "black" : "white") : null
    }]
  }

  return {
    startBoard,
    makeMove,
    getLegalMoves,
  }
}

type ChessContext = {
  startBoard : Board
  makeMove: (m:Match, move:Move) => [string, Match]
  getLegalMoves: (board:Board, pos:Pos) => Pos[]
}

let chessBox : ServerApp<ChessContext> = {
  loadApp : chessCtx,

  api:{

    getBoard:(ctx,arg)=>{
      return ctx.startBoard
    }

  }
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

type Pos = number


let boardSize = (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight) * 0.6
let chessBoard = div({class:"chessboard",style:{
  backgroundColor: "#f0d9b5",
  width: boardSize + "px",
  height: boardSize + "px",
  margin: "auto",
  position: "relative",
  cursor: "pointer",
}})


let displayBoard = (m:Match)=>{

  chessBoard.innerHTML = ""

  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      let square = div({class: "square"})
      square.style.width = boardSize / 8 + "px"
      square.style.height = boardSize / 8 + "px"
      chessBoard.appendChild(square)
      square.style.backgroundColor = (i + j) % 2 === 0 ? "#b58863" : "#f0d9b5"

      square.style.left = j * boardSize / 8 + "px"
      square.style.bottom = i * boardSize / 8 + "px"
      square.style.position = "absolute"


      let piece = m.board[i][j]

      if (piece){
        let pieceElement = div( pieceImages[piece.type], {class:"piece"})
        pieceElement.style.width = boardSize / 8 + "px"
        pieceElement.style.height = boardSize / 8 + "px"
        pieceElement.style.position = "absolute"
        square.appendChild(pieceElement)

        pieceElement.style.color = piece.color === "white" ? "white" : "black"
        pieceElement.style.fontWeight = "bold"
        pieceElement.style.fontSize = boardSize / 8 + "px"
      }
    }
  }
}


export let chessView : PageComponent = (conn:ServerConnection) => {


  conn.handle(chessBox).then(async ({call, users, subscribe})=>{

    console.log("chess app loaded")

    let board = await call(conn.identity, chessBox.api.getBoard).then((board)=>{
      console.log("board", board)
    })
    
  })



  let pg = div({style:{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#f0d9b5",
    "font-family": "monospace"
  }})

  pg.appendChild(chessBoard)

  let match : Match = {
    board: chessCtx(undefined).startBoard,
    white: conn.identity,
    black: "id123",
    turn: "white",
    winner: null,
  }

  displayBoard(match)

  return pg

}
