// Same shape as the server's class-import passwords: three short Latin words and two digits — typed
// on any keyboard layout by a ten-year-old, still far from guessable behind the login rate limit.
const WORDS = "able acorn amber apple arrow aspen atlas badge baker bamboo banjo beach berry birch bison blaze bloom bolt brave breeze brick brook bunny cabin cactus camel candy canoe cedar cherry chess cider cloud clover comet coral crane crisp daisy delta dolphin dream eagle earth echo ember falcon fern flame flint forest fox frost galaxy garden gecko ginger glow grape harbor hazel heron honey igloo island ivory jade jelly jolly jungle kayak kiwi koala lemon lilac lime llama lotus lucky lunar mango maple marble meadow melon mint moon moose nectar noble nova oasis ocean olive orbit otter panda peach pearl pepper piano pilot pixel planet plum polar pony quartz quest radar rain raven river robin rocket ruby sail salmon sandy sky snow solar spark spruce star storm sugar sunny tango tiger topaz tulip tundra velvet violet walnut whale willow wolf zebra".split(" ");
const pick = (n: number) => { const v = new Uint32Array(1); crypto.getRandomValues(v); return v[0] % n; };
export function friendlyPassword() {
  return `${WORDS[pick(WORDS.length)]}-${WORDS[pick(WORDS.length)]}-${WORDS[pick(WORDS.length)]}-${10 + pick(90)}`;
}
