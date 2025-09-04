import {button, div, h2, input, p, popup} from "../html"
import { PageComponent } from "../main"
import { Stored, Writable } from "../store"
import { AppHandle, DefaultContext, IdString, ServerApp, ServerConnection, WSSURL } from "../userspace"
import { ChatService, msgApp } from "./chatbox"


type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king" | "kingmoved" | "rookmoved" | "pawnmoved" | "pawnmoveddouble"



type Piece = {
  type: PieceType
  color: "white" | "black"
}

type Pos = number;


type Board = (Piece | null)[]; // 80x represents whole board

type Match = {
  board: Board
  white: IdString
  black: IdString
  turn: "white" | "black"
  winner: "white" | "black" | "draw" | null
}


type Move = {
  start: Pos
  end: Pos
  promo: PieceType
}


let chessApp = {

  name: "chess",

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
      if (piece.type == "pawn" || piece.type == "pawnmoved" || piece.type == "pawnmoveddouble"){
        let moves =  directions(piece).map((d)=>pos+d).filter((p)=>isPos(p) && getPieceAt(board, p) == null)

        let up = (piece.color == "white" ? 10 : -10);

        let hits = [left,right]
        .map((d) => pos + d + up)
        .filter((t) => {
          let target = getPieceAt(board,t);
          return target && target.color != piece.color
        })

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

      let getRay = (pos:Pos, dir:number):Pos[]=>{
        let pp = pos + dir
        if (!isPos(pp)) {return []}
        let target = getPieceAt(board, pp)
        if (target) {
          if (target.color == piece.color) {return []}
          return [pp]
        }

        if (piece.type == "king" || piece.type == "kingmoved" || piece.type == "knight") {
          return [pp]
        }
        return [pp, ...getRay(pp, dir)]
      }
      return directions(piece).reduce((acc, dir)=>{
        return [...acc, ...getRay(pos, dir)]
      }, [])

    }

    function makeMove(m:Match, move:Move):[string, Match]{

      let piece = getPieceAt(m.board, move.start)
      if (!piece) {return ["no piece at start", m]}
      if (m.winner != null) {return ["game over", m]}
      if (piece.color != m.turn) {return ["not your turn", m]}
      
      let options = getLegalMoves(m.board, move.start)

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
        white: m.white,
        black: m.black,
        board: newBoard,
        turn: m.turn == "white" ? "black" : "white",
        winner: null
      }

      

      if (ptype == "pawnmoved"){
        if (dist % 10 != 0){
          let passant = move.end % 10 + Math.floor(move.start / 10) * 10
          let target = getPieceAt(resMatch.board, passant)

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

    startMatch: (c, arg) :[string, Match | null]=>{

      let match: Match = {
        white: c.self,
        black: c.other,
        board: c.startBoard,
        turn: "white",
        winner: null
      };

      if (c.DB.get(true, "match_host")){
        return ["already playing", null]
      }

      if (c.DB.get(false, "match_host")){
        return ["opponent already playing", null]
      }

      c.DB.set(true, "match_host", c.self)
      c.DB.set(false, "match_host", c.self)
      c.DB.set(true, "match_data", match)


      return ['', match]

    },

    getHost: (c:DefaultContext, arg)=>{
      return c.DB.get(true, "match_host")
    },

    getMatch: (c, arg)=>{
      return c.DB.get(false, "match_data")
    },


    resignMatch: (c, arg) :[string, Match | null]=>{

      let imhost = c.DB.get(true, "match_host") == c.self;
      let match = c.DB.get(imhost, "match_data") as Match;

      if (match.black != c.self && match.white != c.self) {
        return ["not your match", null]
      }

      if (match.black != c.other && match.white != c.other) {
        return ["not your opponent", null]
      }

      let winner = match.white == c.self ? "black" : "white" as "white" | "black";

      let newmatch = {
        ...match,
        winner
      };
      c.DB.set(imhost, "match_data", newmatch);
      c.notify({
        type: "game over",
        data: newmatch
      })
      c.DB.set(true, "match_host", null);
      c.DB.set(false, "match_host", null);
      return ["", newmatch];


    },

    requestMove: (c : DefaultContext & ChessContext, arg : Move) :[string, Match | null]=>{

      let match = c.DB.get(false, "match_data") as Match;
      if (match.winner != null) {
        return ["game over", match]
      }
      if (match.turn == "white" && match.white != c.self) {
        return ["not your turn", match]
      }
      if (match.turn == "black" && match.black != c.self) {
        return ["not your turn", match]
      }

      let [err, newmatch] = c.makeMove(match, arg);

      if (err.length > 0) {
        return [err, match]
      }
      c.DB.set(false, "match_data", newmatch);

      c.notify({
        type: "new move",
        data: newmatch
      })
      return [err, newmatch];
    },
  }
}// as ServerApp<ChessContext>


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



let focuspos = 0

let displayBoard = (m:Match, onMove: (m:Move)=>void)=>{

  let chessBoard = div({class:"chessboard",style:{
    backgroundColor: "#f0d9b5",
    width: boardSize + "px",
    height: boardSize + "px",
    margin: "auto",
    position: "relative",
    cursor: "pointer",
  }})
  

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
      focuspos = focuspos == n ? null : n
      onMove(move)
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

  return chessBoard
}




type ChessNotification = {
  type: "new move"
  data: Match
} | {
  type: "new match"
  data: IdString
} | {
  type: "game over"
  data: Match
}


function getother (m:Match, self:IdString):IdString{
  if (m.white == self) {return m.black}
  if (m.black == self) {return m.white}
  return null
}

export class ChessService {

  match : Writable<Match> = new Writable<Match | null >(null)
  conn: AppHandle

  chatService: ChatService

  host: Writable<IdString | null>


  constructor(public server:ServerConnection){


    this.conn = new AppHandle(server, chessApp, (note:ChessNotification)=>{
      if (note.type == "new move"){
        this.match.set(note.data);
      }else if (note.type == "new match"){
        this.host.set(note.data);
      }else if (note.type == "game over"){
        this.match.set(note.data)
      }
    })

    this.chatService = new ChatService(server)

    this.host = new Writable<IdString | null>(null)

    this.host.subscribe((h)=>{
      if (h){
        this.conn.call(h, chessApp.api.getMatch).then((m:Match)=>{
          this.match.set(m, true);
        })
      }else{
        this.match.set(null, true);
      }
    })

    this.conn.call(this.server.identity, chessApp.api.getHost).then((h:IdString | null)=>{


      this.host.set(h,true);
    })
  }


  render(){

    let chessRules = chessApp.loadApp(undefined);

    return div(
      {style:{
        padding: "20px",
      }},

      h2("chess"),


      this.host.map(h=>{
        let matchMaker = button("new match", {onclick: ()=>{
          this.conn.users().then((users:IdString[])=>{
            let oppicker = popup(
              h2("choose an opponent"),
              users.map(async (user)=>{
                let occ = await this.conn.call(user, chessApp.api.getHost)
                if (occ != null) return null
                return p(
                  button(this.chatService.getName(user), {onclick: ()=>{
                    this.conn.call(user, chessApp.api.startMatch).then(([err, newmatch])=>{
                      if (err){
                        popup(err);
                      }else{
                        this.conn.call(user, chessApp.api.getHost).then((h:IdString | null)=>{this.host.set(h);})
                        this.match.set(newmatch);
                        oppicker.remove();
                      }
                    })
                  }})
                )
              })
            )
          })
        }})

        return h
        ? this.match.map(m=>{

          if (m) {
            let opponent = getother(m, this.conn.identity);
            return [
              displayBoard(m, (move)=>{
                this.conn.call(h, chessApp.api.requestMove, move)
                .then(([err, newmatch])=>{this.match.set(newmatch)})
              }),
              p("my name:", this.chatService.getName(this.conn.identity)),
              p("white:", this.chatService.getName(m.white)),
              p("black:", this.chatService.getName(m.black)),
              p("turn:",m.turn),
              p("winner:",m.winner),
              m.winner == null ? button("resign", {onclick: ()=>{

                this.conn.call(opponent, chessApp.api.resignMatch, null).then(([err, newmatch])=>{
                  if (err){
                    popup(err);
                  }else{
                    this.match.set(newmatch);
                  }
                })
              }}) : matchMaker
            ]
          }
          return matchMaker
        })
        : matchMaker

      }),
    )
  }
}
