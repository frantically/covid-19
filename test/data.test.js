const fs = require('fs')
const { CoronaStatistics, csvStringToJson, openZHExtractor } = require("../src/data.js");

function loadTestData(file = 'test/unittest.csv') {
    var csv = fs.readFileSync(file).toString()
    return new CoronaStatistics(csvStringToJson(csv, openZHExtractor))
}

test("Scaffolded data should be 10 long", () => {
    var data = loadTestData()
    expect(data.getData('CH').length).toBe(10);
});

test("First CH casesTotal should be just from GR = 1", () => {
    var data = loadTestData()
    expect(data.getData('CH')[0].casesTotal).toBe(1);
});

test("Last CH casesTotal should be not be carried", () => {
    var data = loadTestData()
    expect(data.getData('CH')[8].casesTotal).toBe(54); //from actual data
    expect(data.getData('CH')[9].casesTotal).toBe(NaN); //not carried because it's after the last complete data set
});

test("ZH casesTotal for 05.11.2020 should be be carried from 04.11.2020", () => {
    var data = loadTestData()
    expect(data.getData('ZH')[4].ncumul_conf_raw).toBe(undefined); //carried 
    expect(data.getData('ZH')[4].casesTotal).toBe(3); //carried
});

test("Max Date for CH should be 09.11.2020", () => {
    var data = loadTestData()
    expect(data.getMaxDate('CH')).toBe(Date.parse("2020-11-09"))
})

test("Max Date for GR should be 10.11.2020", () => {
    var data = loadTestData()
    expect(data.getMaxDate('GR')).toBe(Date.parse("2020-11-10"))
})

test("7 Day Total for ZH should be 7", () => {
    var data = loadTestData()
    expect(data.getSeries("ZG", "casesTotal7d").map(s => s.y)).toStrictEqual([undefined, undefined, undefined, undefined, undefined, undefined, undefined, 36, 42, 49])
})

test("ZH Data 7 day cases", () => {
    var data = loadTestData('test/unittest_extended.csv')
    expect(data.getSeries("ZH", "casesTotal7d").map(s => s.y).filter(s => s)).toStrictEqual([20, 33, 53, 86, 139, 225, 364, 589, 953, 1542, 2495])
})

test("ZH Data Cases Last Week", () => {
    var data = loadTestData('test/unittest_extended.csv')
    expect(data.getSeries("ZH", "casesTotal7d").map(s => s.y).filter(s => s)).toStrictEqual([20, 33, 53, 86, 139, 225, 364, 589, 953, 1542, 2495])
})

test("ZH Data Cases Prior Week", () => {
    var data = loadTestData('test/unittest_extended.csv')
    expect(data.getLastWeek("ZH", "casesTotal")).toBe(2495)
})

test("ZH Data Cases Prior Week", () => {
    var data = loadTestData('test/unittest_extended.csv')
    expect(data.getPriorWeek("ZH", "casesTotal")).toBe(86)
})
