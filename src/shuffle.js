// Directly copied from https://git.coolaj86.com/coolaj86/knuth-shuffle.js/src/branch/master/index.js
// in order to get pure ES module. The npm package is knuth-shuffle.
export const shuffle = (array) => {
  var currentIndex = array.length
  var temporaryValue
  var randomIndex

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }

  return array
}
