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
    Victory = "gewonnen",
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
        return Array(this.mySea.cells.length + 1).fill(null).map((_,ri) => {
            const inter = " ";
            const mySeaLine = ri == 0 ? this.abc.split("").join(inter) : this.mySea.cells[ri-1].map((v,ci) => hits === null ? v : hits.cells[ri-1][ci] === HitState.Hit ? 'x' : v).join(inter);
            const hisSeaLine = ri == 0 ? this.abc.split("").join(inter) : this.hisSea.cells[ri-1].join(inter);
            return (ri < 1 ? " " : String(this.mySea.cells.length + 1 - ri)) + "  " + mySeaLine + "  " + hisSeaLine; 
        }).join("\n");

    }

    get abc():string {
        return Array(this.mySea.cells[0].length).fill(0).map((_, i) => String.fromCharCode("A".charCodeAt(0) + i)).join("");
    }

    async guess():Promise<ZResponse> {

        if (!this.opponent)
            throw "tantrum";
        while(true) {
            let coord:number[];
            let tryDir = "U";
            if (this.interactive) {
                console.log(this.toString(this.opponent.hisSea));
                let answer = "";
                const re = RegExp(`^[${this.abc}][1-${this.mySea.cells.length}]$`);
                while (!re.test(answer))
                    answer = await rl.question("Which coords? ");

                coord = [this.mySea.cells.length - parseInt(answer[1]), this.abc.indexOf(answer[0])];
            } else {
                if (this.memory) {
                    const c = this.memory.coord;
                    if (this.memory.dir === "U" && c[0] > 0 && this.hisSea.cells[c[0] - 1][c[1]] === HitState.Unknown) {
                        coord = [c[0] - 1,c[1]];
                        tryDir = "V";
                    } else if (this.memory.dir === "U" && c[0] < this.mySea.cells.length - 1 && this.hisSea.cells[c[0] + 1][c[1]] === HitState.Unknown) {
                        coord = [c[0] + 1,c[1]];
                        tryDir = "V";
                    } else if (this.memory.dir === "U" && c[1] > 0 && this.hisSea.cells[c[0]][c[1] - 1] === HitState.Unknown) {
                        coord = [c[0],c[1] - 1];
                        tryDir = "H";
                    } else if (this.memory.dir === "U") {
                        coord = [c[0],c[1] + 1];
                        tryDir = "H";
                    } else if (this.memory.dir === "V") {
                        const offset = [-1,1,-2,2,-3,3,-4,4].find(o => c[0] + o > 0 && c[0] + o < this.mySea.cells.length && this.hisSea.cells[c[0] + o][c[1]] === HitState.Unknown);
                        if (!offset)
                            throw "tantrum";
                        coord = [c[0] + offset,c[1]];
                    } else {
                        const offset = [-1,1,-2,2,-3,3,-4,4].find(o => c[1] + o > 0 && c[1] + o < this.mySea.cells[0].length && this.hisSea.cells[c[0]][c[1] + o] === HitState.Unknown);
                        if (!offset)
                            throw "tantrum";
                        coord = [c[0],c[1] + offset];
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
                    this.memory = null;
                }
                return outcome;
            }
        }
    }

    async evaluate(coord:number[], hisGuesses:Board<HitState>):Promise<ZResponse> {
        if (!this.opponent)
            throw "tantrum";
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
