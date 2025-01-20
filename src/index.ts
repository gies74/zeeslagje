import { Player, ZResponse } from "./game/player";

const main = async () => {
    const players:Player[] = [new Player(true), new Player(false)];

    players[0].opponent = players[1];
    players[1].opponent = players[0];

    let turn = 0;
    let response:ZResponse = ZResponse.Missed;

    while (response !== ZResponse.Victory) {
        do {
            response = await players[turn % 2].guess();
        } while ([ZResponse.Hit, ZResponse.HitAndSunk].includes(response));

        turn++;
    }
    console.log(`TOTAL DESTRUCTION! Player ${1 + 1 - (turn%2)} won in ${Math.ceil(turn / 2)} turns!`);
    console.log(``);
    console.log(`Player 1:\n${players[0].toString()}`);
    console.log(`Player 2:\n${players[1].toString()}`);
    process.exit(0);
};

main();




