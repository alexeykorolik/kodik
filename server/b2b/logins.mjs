// One rule for every new login (registration, a single member, class import): what a child can type
// exactly as it was written on the card. Existing logins keep working; the rule applies to new ones.
import {randomInt} from 'node:crypto';
export const LOGIN_RULE='Логин: латинские буквы, цифры, точка, дефис или «_», от 3 до 120 символов, без пробелов.';
export const loginProblem=login=>/^[a-z0-9][a-z0-9._-]{2,119}$/.test(login)?'':LOGIN_RULE;
const letters={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
/** A login suggested from a name: «Аня Петрова» → «anya.petrova». */
export function loginFromName(name){
  const base=[...String(name||'').toLowerCase()].map(c=>letters[c]??c).join('').replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,40);
  return base.length>=3?base:`${base||'student'}.${randomInt(100,1000)}`;
}
// Short Latin words typed on any layout; three words and two digits keep guessing out of reach
// behind the login rate limit (15 tries per 15 minutes) while a ten-year-old can type them.
const WORDS='able acorn amber apple arrow aspen atlas bacon badge baker bamboo banjo beach berry birch bison blaze bloom bluff bolt brave breeze brick brook bunny cabin cactus camel candy canoe cedar cherry chess cider cloud clover cobra comet coral cosmo crane crisp daisy delta dingo dolphin dream eagle earth echo ember fable falcon fern fiesta flame flint float forest fox frost galaxy garden gecko ginger glow grape gravel harbor hazel heron honey igloo island ivory jade jelly jolly jungle kayak kiwi koala lemon lilac lime llama lotus lucky lunar mango maple marble meadow melon mint mocha moon moose nectar noble nova oasis ocean olive orbit otter panda peach pearl pepper piano pilot pixel planet plum polar pony puma quartz quest radar rain raven river robin rocket ruby saber sail salmon sandy sky snow solar spark spruce star storm sugar sunny tango tiger topaz tulip tundra velvet violet walnut whale willow wolf zebra'.split(' ');
export function friendlyPassword(){
  const w=()=>WORDS[randomInt(WORDS.length)];
  return `${w()}-${w()}-${w()}-${randomInt(10,100)}`;
}
