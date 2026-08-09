import pkg from 'scrambow';
const { Scrambow } = pkg;
/*
This function is used to generate scrambles on the server for the puzzles.
The functionality is limited to 3x3 in the duration for which the challenge-battle feature is in the works.
*/

export const generateScramble = () => {
    const threeByThree = new Scrambow().setType('333').get();
    return threeByThree[0].scramble_string;
};

