const fs = require('fs')
const { FOPHCoronaStatistics } = require("../src/foph.js");
const { csvStringToJson } = require("../src/utils.js");

function loadTestData(file = 'test/foph.csv') {
    var csv = fs.readFileSync(file).toString()
    return new FOPHCoronaStatistics(csvStringToJson(csv), {ZH: {population: 200000}})
}

test("Max Date Strips Incomplete Entries at the end", () => {
    var data = loadTestData()
    expect(data.getMaxDate('ZH')).toBe(Date.parse("2020-06-18"));
})

test("Total Series", () => {
    var data = loadTestData()
    expect(data.getTotalDataSeries('ZH').map(s => s.y)).toStrictEqual([1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584])
})

test("7 Day Average Series", () => {
    var data = loadTestData()
    var result = data.get7DayAverageDataSeries('ZH').map(s => s.y).slice(-4)
    var expected = [84.14285714, 136.1428571, 220.2857143, 356.4285714]
    compareNumberArray(result, expected)
})

test("Last Week", () => {
    var data = loadTestData()
    expect(data.getLastWeekTotal('ZH')).toBe(2495)
})

test("Week on Week Percentage", () => {
    var data = loadTestData()
    expect(data.getLastWeekOnWeekPercentage("ZH")).toBe(2801.1627906976746)

})

test("7 Day Average Series", () => {
    var data = loadTestData()
    var result = data.getCasesPer100kDataSeries("ZH").map(s => s.y).slice(-4)
    var expected = [84.14285714/2, 136.1428571/2, 220.2857143/2, 356.4285714/2]
    compareNumberArray(result, expected)
})

function compareNumberArray(result, expected) {
    for(var i=0;i<expected.length;i++) {
        expect(result[i]).toBeCloseTo(expected[i], 5)
    }
}