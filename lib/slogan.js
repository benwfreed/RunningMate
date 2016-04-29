var slogan = [
    "Ahoy there, matey.",
    "Run mate, run.",
    "Check (me out), mate,",
    "On your marks, get set, mate."
];

exports.getSlogan = function() {
    var index = Math.floor(Math.random() * slogan.length);
    return slogan[index];
}

console.log(getSlogan());