const fs = require('fs')


function loadTestData() {
    return JSON.parse(fs.readFileSync('foph.json'))
}

test("Scaffolded data should be 10 long", () => {
    var data = loadTestData()
    data = data.filter(x => x.geoRegion === "CH")
    console.log(data.length)
});
