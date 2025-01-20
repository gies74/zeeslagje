import { Vessel, Board, VesselState, HitState } from "./board";
import * as readline from 'readline/promises';

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

enum ZResponse {
    Missed = "missed",
    Hit = "hit",
    HitAndSunk = "hit-and-sunk",
    Victory = "victory",
}

const vessels = [
    new Vessel(5),
    new Vessel(4),
    new Vessel(3),
    new Vessel(3),
    new Vessel(2)
];

class Memory {
    coord:number[];
    dir:string = "U";
    constructor(coord:number[]) {
        this.coord = coord;
    }
}


class Player {
    mySea:Board<VesselState>;
    hisSea:Board<HitState>;
    interactive:boolean;
    opponent:Player|null = null;
    memory:Memory|null = null;
    constructor(interactive:boolean) {
        this.interactive = interactive;
        this.mySea = new Board<VesselState>(VesselState.Empty);
        this.mySea.placeVessels(vessels, VesselState.Filled);
        this.hisSea = new Board<HitState>(HitState.Unknown);        
    }

    toString(hits:null|Board<HitState> = null):string {
        return Array(this.mySea.cells.length + 2).fill(null).map((_,ri) => {
            const [smallGap, bigGap] = [" ", "    "];
            const isLetterLine = [0, this.mySea.cells.length + 1].includes(ri);
            const rowNum = isLetterLine ? " " : String(this.mySea.cells.length + 1 - ri);
            const mySeaLine = isLetterLine ? this.abc.split("").join(smallGap) : this.mySea.cells[ri-1].map((v,ci) => hits === null ? v : hits.cells[ri-1][ci] === HitState.Hit ? 'x' : v).join(smallGap);
            const hisSeaLine = isLetterLine ? this.abc.split("").join(smallGap) : this.hisSea.cells[ri-1].join(smallGap);
            return rowNum + smallGap + hisSeaLine + bigGap + rowNum + mySeaLine; 
        }).join("\n");

    }

    get abc():string {
        return Array(this.mySea.cells[0].length).fill(0).map((_, i) => String.fromCharCode("A".charCodeAt(0) + i)).join("");
    }

    async guess():Promise<ZResponse> {

        if (!this.opponent)
            throw "tantrum 1";
        while(true) {
            let coord:number[]|undefined;
            let tryDir = "U";
            if (this.interactive) {
                console.log(this.toString(this.opponent.hisSea));
                let answer = "";
                const re = RegExp(`^[${this.abc}][1-${this.mySea.cells.length}]$`, "i");
                while (!re.test(answer))
                    answer = await rl.question("Which coords? ");

                coord = [this.mySea.cells.length - parseInt(answer[1]), this.abc.indexOf(answer[0].toUpperCase())];
            } else {
                if (this.memory) {
                    const mc = this.memory.coord;
                    const md = this.memory.dir;
                    if (md === "U" && (coord = [[mc[0] - 1,mc[1]],[mc[0] + 1,mc[1]],[mc[0],mc[1] - 1],[mc[0],mc[1] + 1]].find(xc => ![-1,this.mySea.cells.length].includes(xc[0]) && ![-1,this.mySea.cells[0].length].includes(xc[1]) && this.hisSea.cells[xc[0]][xc[1]] === HitState.Unknown))) {
                        tryDir = Math.abs(mc[0] - coord[0]) === 1 ? "V" : "H";
                    } else {
                        let [nb, pb] = [false, false];
                        const offset = [-1,1,-2,2,-3,3,-4,4].find(o => {
                            const nxt = [mc[0] + (md === "V" ? o : 0), mc[1] + (md === "V" ? 0 : o)];
                            if (nxt[0] < 0 || nxt[0] >= this.mySea.cells.length || nxt[1] < 0 || nxt[1] >= this.mySea.cells[0].length) {
                                return false;
                            }
                            const hs = this.hisSea.cells[nxt[0]][nxt[1]];
                            if (hs === HitState.Missed) {
                                nb = nb || o < 0;
                                pb = pb || o > 0;
                            }
                            return (o > 0 || !nb) && (o < 0 || !pb) && hs == HitState.Unknown;
                        });
                        if (!offset)
                            throw "tantrum 2";
                        coord = [mc[0] + (md === "V" ? offset : 0),mc[1] + (md === "V" ? 0 : offset)];
                    }
                } else {
                    coord = [Math.floor(Math.random() * this.hisSea.cells.length), Math.floor(Math.random() * this.hisSea.cells[0].length)];
                }
            }
            if (this.hisSea.cells[coord[0]][coord[1]] === HitState.Unknown) {
                const outcome = await this.opponent.evaluate(coord, this.hisSea);
                if (this.interactive) {
                    console.log(`${outcome}`);
                }
                if (outcome == ZResponse.Hit) {
                    if (this.memory === null)
                        this.memory = new Memory(coord);
                    else if (this.memory.dir === "U")
                        this.memory.dir = tryDir;                    
                } else if ([ZResponse.HitAndSunk, ZResponse.Victory].includes(outcome)) {
                    if (!this.memory)
                        throw "tantrum 5";
                    if ("VH".includes(this.memory.dir)) {
                        this._secureMissed(this.memory.coord, -1);
                        this._secureMissed(this.memory.coord, 1);
                    }
                    this.memory = null;
                }
                return outcome;
            }
        }
    }

    _secureMissed(coord:number[], step:number) {
        if (this.hisSea.cells[coord[0]][coord[1]] !== HitState.Hit) {
            this.hisSea.cells[coord[0]][coord[1]] = HitState.Missed;
            return;
        }
        const md = this.memory?.dir;
        [-1, 1].forEach(ofs => {
            if (md === "V" && ![-1, this.mySea.cells[0].length].includes(coord[1] + ofs) || md !== "V" && ![-1, this.mySea.cells.length].includes(coord[0] + ofs))
                this.hisSea.cells[coord[0]+(md==="V" ? 0 : ofs)][coord[1]+(md==="V" ? ofs : 0)] = HitState.Missed;
        });
        const delta = [coord[0] + (md === "V" ? step : 0), coord[1] + (md === "V" ? 0 : step)];
        if (![-1, this.mySea.cells.length].includes(delta[0]) && ![-1, this.mySea.cells[0].length].includes(delta[1]))
            this._secureMissed(delta, step);

    }    

    async evaluate(coord:number[], hisGuesses:Board<HitState>):Promise<ZResponse> {
        if (!this.opponent)
            throw "tantrum 4";
        const missed = this.mySea.cells[coord[0]][coord[1]] == VesselState.Empty;
        hisGuesses.cells[coord[0]][coord[1]] = missed ? HitState.Missed : HitState.Hit;
        let resp:ZResponse;
        if (missed)
            resp = ZResponse.Missed;
        else {
            const victory = this.mySea.cells.reduce((won, myRow, myRi) => won && myRow.every((myC, myCi) => myC === VesselState.Empty || hisGuesses.cells[myRi][myCi] === HitState.Hit), true);
            if (victory)
                resp = ZResponse.Victory;
            else {
                const vesselSunk = [[-1,0],[1,0],[0,-1],[0,1]].every(dir => this.mySea.allHit(coord, hisGuesses, dir));
                if (vesselSunk)
                    resp = ZResponse.HitAndSunk;
                else
                    resp = ZResponse.Hit;
            }
        }
        if (this.interactive) {
            const responseOptions:{[key:string]:ZResponse} = { "M":ZResponse.Missed, "H":ZResponse.Hit, "S":ZResponse.HitAndSunk, "V":ZResponse.Victory };
            const letter = this.abc[coord[1]];
            console.log(this.toString(this.opponent.hisSea));
            let answer = await rl.question(`${letter}${9-coord[0]} [${resp}]? `);
            if (!/^MHSV$/.test(answer))
                return resp;
            return responseOptions[answer];
        }
        return resp;
    }
}

export { Player, ZResponse };
