var sum = [3, NaN, 4].filter(i => i).reduce((a, c) => a+c, 0)
console.log(sum)

console.log(Date.parse("2020-11-02")-Date.parse("2020-11-01"))


console.log(isNaN(undefined))

function formatDate(d) {
    return `${new Date(d).toLocaleDateString("de-CH")}`
}

var obj ={"^ndate": 'asdasd', 'banana': 123}


console.log(obj)