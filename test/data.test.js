const fs = require('fs')
const { createDataFromCSV } = require("../src/data.js");

function loadTestData() {
    var csv = fs.readFileSync('test/unittest.csv').toString()
    return createDataFromCSV(csv)
}

test("Scaffolded data should be 10 long", () => {
    var data = loadTestData()
    expect(data['CH'].length).toBe(10);
});

test("First CH ncumul_conf should be just from GR = 1", () => {
    var data = loadTestData()
    expect(data['CH'][0].ncumul_conf).toBe(1);
});

test("Last CH ncumul_conf should be not be carried", () => {
    var data = loadTestData()
    expect(data['CH'][8].ncumul_conf).toBe(9); //from actual data
    expect(data['CH'][9].ncumul_conf).toBe(NaN); //not carried because it's after the last complete data set
});

test("ZH ncumul_conf for 05.11.2020 should be be carried from 04.11.2020", () => {
    var data = loadTestData()
    expect(data['ZH'][4].ncumul_conf_raw).toBe(undefined); //carried 
    expect(data['ZH'][4].ncumul_conf).toBe(3); //carried
    expect(data['CH'][4].ncumul_conf).toBe(4); //carried
});