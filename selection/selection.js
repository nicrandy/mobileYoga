

var original = document.getElementById("all");
var clone = original.cloneNode(true);
clone.id = 'workout2';
// change the inner html of the clone
document.getElementById("body").appendChild(clone);
const parent = document.querySelector('#workout2');
console.log(parent);
const child = document.querySelectorAll('[id=name]');
console.log(child[1]);
child[1].innerHTML = 'Strettttttttch';

var original = document.getElementById("all");
var clone = original.cloneNode(true);
clone.id = 'workout3';
document.getElementById("body").appendChild(clone);

var original = document.getElementById("all");
var clone = original.cloneNode(true);
clone.id = 'workout4';
document.getElementById("body").appendChild(clone);
