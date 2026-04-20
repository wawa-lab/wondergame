const data = require('./backend/src/data/gameData.js');
const consequence = data.npcs.royal_emperor.dialogueWithChoice.choices[0].consequence;
console.log('Has subSceneDialogues:', !!consequence.subSceneDialogues);
console.log('Dialogues count:', consequence.subSceneDialogues?.length);
console.log('Has subSceneChoices:', !!consequence.subSceneChoices);
console.log('\nAll keys in consequence:');
console.log(Object.keys(consequence).sort());

