import { Player, ZResponse } from "./game/player";

const main = async () => {
    const players:Player[] = [new Player(true), new Player(false)];

    players[0].opponent = players[1];
    players[1].opponent = players[0];

    let turn = 0;
    let response:ZResponse = ZResponse.Missed;

    while (response !== ZResponse.Victory) {
        do {
            response = await players[turn % players.length].guess();
        } while ([ZResponse.Hit, ZResponse.HitAndSunk].includes(response));

        turn++;
    }
    console.log(`TOTAL DESTRUCTION! Player won in ${Math.ceil(turn / players.length)} turns!`);
    console.log(``);
    players.forEach((p,pi) => console.log(`Player ${pi + 1}:\n${p.toString()}`));
    process.exit(0);
};

main();
