const DIMS : number[] = [9, 11];

enum HitState {    
    Hit = "X",
    Missed = "O",
    Unknown = ".",
}

enum VesselState {
    Filled = "#",
    Empty = ".",
}


class Vessel {
    length:number;
    constructor(length:number) {
        this.length=length;
    }
}

class Board<T> {
    cells: T[][];
    x:number;
    constructor(def:T) {
        this.cells = Array(DIMS[0]).fill(null).map(() => Array(DIMS[1]).fill(def));
        this.x = 1;
    }

    placeVessels(vessels: Vessel[], fillValue:T) {
        vessels.forEach((vessel) => {
            while (true) {
                const horizontal = Math.random() >= .5;
                const baseCoord = [
                    Math.floor(Math.random() * (this.cells.length - (horizontal ? 0 : vessel.length))),
                    Math.floor(Math.random() * (this.cells[0].length - (horizontal ? vessel.length : 0))),
                ];  
                const deltas = [
                    [-1, 0],
                    [1, 0],
                    [0, -1],
                    [0, 1],
                ]              

                if (baseCoord.every(c => c >= 0) && Array(vessel.length).fill(null).every((_, pos) => {
                    const vesselCoord = [baseCoord[0] + (horizontal ? 0 : pos), baseCoord[1] + (horizontal ? pos : 0)];
                    return deltas.every(delta => {
                        const testCoord = [vesselCoord[0] + delta[0], vesselCoord[1] + delta[1]];
                        return testCoord.some(c => c < 0) || testCoord[0] >= this.cells.length || testCoord[1] >= this.cells[0].length || this.cells[testCoord[0]][testCoord[1]] === VesselState.Empty;
                    });
                })) {
                    Array(vessel.length).fill(null).forEach((_, pos) => {
                        this.cells[baseCoord[0] + (horizontal ? 0 : pos)][baseCoord[1] + (horizontal ? pos : 0)] = fillValue;
                    });                    
                    break;
                }
            }
        });
    }

    /**
     * Returns False if there are vesselcoordinates in the given direction which haven't been guessed yet. True otherwise.
     * @param coord 
     * @param hisGuesses 
     * @param dir 
     * @returns 
     */    
    allHit(coord:number[], hisGuesses:Board<HitState>, dir:number[]):boolean {
        const nCoord = [coord[0] + dir[0], coord[1] + dir[1]];
        const offBoard = nCoord.some(c => c < 0) || nCoord[0] >= this.cells.length || nCoord[1] >= this.cells[0].length;
        if (offBoard || this.cells[nCoord[0]][nCoord[1]] == VesselState.Empty)
            return true;
        if (hisGuesses.cells[nCoord[0]][nCoord[1]] == HitState.Unknown)
            return false;
        return this.allHit(nCoord, hisGuesses, dir);
    }
}

export { Board, Vessel, VesselState, HitState };
