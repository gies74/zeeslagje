import { Player, ZResponse } from "./game/player";

const main = async () => {
    const player1:Player = new Player(true);
    const player2:Player = new Player(false);
    const players:Player[] = [player1, player2];

    player1.opponent = player2;
    player2.opponent = player1;

    let turn = 0;
    let response:ZResponse = ZResponse.Missed;

    while (response !== ZResponse.Victory) {
        do {
            response = await players[turn].guess();
        } while ([ZResponse.Hit, ZResponse.HitAndSunk].includes(response));

        turn = 1 - turn;
    }
    console.log(`Player ${1 + 1 - turn} won!`);
    console.log(`Player 1:\n${player1.toString()}`);
    console.log(`Player 2:\n${player2.toString()}`);
};

main();




