const fs = require('fs')
const { CoronaStatistics } = require("../src/data.js");

function loadTestData() {
    var csv = fs.readFileSync('test/unittest.csv').toString()
    return new CoronaStatistics(csv)
}

test("Scaffolded data should be 10 long", () => {
    var data = loadTestData()
    expect(data.getData('CH').length).toBe(10);
});

test("First CH ncumul_conf should be just from GR = 1", () => {
    var data = loadTestData()
    expect(data.getData('CH')[0].ncumul_conf).toBe(1);
});

test("Last CH ncumul_conf should be not be carried", () => {
    var data = loadTestData()
    expect(data.getData('CH')[8].ncumul_conf).toBe(9); //from actual data
    expect(data.getData('CH')[9].ncumul_conf).toBe(NaN); //not carried because it's after the last complete data set
});

test("ZH ncumul_conf for 05.11.2020 should be be carried from 04.11.2020", () => {
    var data = loadTestData()
    expect(data.getData('ZH')[4].ncumul_conf_raw).toBe(undefined); //carried 
    expect(data.getData('ZH')[4].ncumul_conf).toBe(3); //carried
    expect(data.getData('CH')[4].ncumul_conf).toBe(4); //carried
});

test("Max Date for CH should be 09.11.2020", () => {
    var data = loadTestData()
    expect(data.getMaxDate('CH')).toBe(Date.parse("2020-11-09"))
})

test("Max Date for GR should be 10.11.2020", () => {
    var data = loadTestData()
    expect(data.getMaxDate('GR')).toBe(Date.parse("2020-11-10"))
})

test("Change in ncumul_conf for CH in the last 3 days should be 2", () => {
    var data = loadTestData()
    expect(data.getSeriesChange('CH', "ncumul_conf", -3)).toBe(2)
    //console.log(data)
})

test("Change in ncumul_conf for CH for 6 days ago to  days ago to be 2", () => {
    var data = loadTestData()
    expect(data.getSeriesChange('CH', "ncumul_conf", -6, -2)).toBe(3)
})