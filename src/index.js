// TODO
// UNIT TESTS
// VALIDATE DATA AGAINST CORONA-DATA.CH THIS IS LOWER
// KEYS SAMPLE_DATA_ is there a better way to do this?
// SPARK LINES FOR THE LAST 7 DAYS?
// LATEST DATE ISN'T LOOKING AT COMPLETE DAYS ONLY
// STRIP OUT THE EARLY DAYS WITH LITTLE DATA?

const PROMINENT_SERIES_ALPHA = 1
const DEFAULT_SERIES_ALPHA = 0.5

const SAMPLE_DATA_FIELDS_SOURCE = ["ncumul_tested" , "ncumul_conf" , "new_hosp" , "current_hosp", "current_icu" , "current_vent" , "ncumul_released" , "ncumul_deceased", "current_isolated", "current_quarantined" , "current_quarantined_riskareatravel", "current_quarantined_total" ]
const SAMPLE_DATA_FIELDS_ALL = SAMPLE_DATA_FIELDS_SOURCE.concat(["conf", "deceased"])
const SAMPLE_DATA_FIELDS_CARRY = ["ncumul_conf", "ncumul_deceased"]
const SAMPLE_DATA_FIELDS_ALL_NEW = SAMPLE_DATA_FIELDS_SOURCE.concat(["ncumul_conf_raw", "ncumul_deceased_raw"])

const ONE_DAY = 24 * 60 * 60 * 1000

var cantonConfig = {}

function scaffoldData(source) {
    var minMax = source.reduce((a, c) => {
        a.min = Math.min(c.date, a.min)
        a.max = Math.max(c.date, a.max)
        return a
    }, {min: Number.MAX_VALUE , max: 0})
    console.log(`Date Range in data: ${formatDate(minMax.min)} - ${formatDate(minMax.max)}`)
    var days = []
    for(i = minMax.min;i<= minMax.max;i = i+ONE_DAY) {
        days.push(i)
    }
    var cantons = getCantons(source)
    var result = {}
    cantons.forEach(canton => {
        var cantonData = getCantonDataByDate(source, canton)
        var cantonScaffoldedData = days.map(date => {
            return cantonData[date] ? cantonData[date] : {date: date, abbreviation_canton_and_fl: canton}
        })
        result[canton] = cantonScaffoldedData
    })
    carryForwardAccumlatedValues(result)
    result['CH'] = aggregateCH(result)
    return result
}

function carryForwardAccumlatedValues(data) {
    Object.values(data).forEach(cantonData => {
        var lastValue = { }

        //carry forward current value if new value not provided
        cantonData.forEach(sample => {
            SAMPLE_DATA_FIELDS_CARRY.forEach(field => {
                sample[`${field}_raw`] = sample[field]
                if(isNaN(sample[field])) {
                    sample[field] = lastValue[field] || 0
                } else {
                    lastValue[field] = sample[field]
                }
            })
        })

        //but wipe out any extrapolation after the last value in the underlying data source
        SAMPLE_DATA_FIELDS_CARRY.forEach(field => {
            var i = cantonData.length - 1
            while(isNaN(cantonData[i][`${field}_raw`]) && i > 0) {
                cantonData[i][field] = NaN
                i--
            }
        })
    })
}

function aggregateCH(data) {
    var cantonsData = Object.values(data)
    var sampleCount = cantonsData[0].length
    var result = []
    for(i=0;i<sampleCount;i++) {
        var sample = {date: cantonsData[0][i].date, abbreviation_canton_and_fl: "CH" }
        SAMPLE_DATA_FIELDS_ALL_NEW.forEach(field => {
            var value = cantonsData
                .map(cantonValues => cantonValues[i][field])
                .reduce((a, v) => a + v, 0)
            sample[field] = value
        })
        result.push(sample)
    }
    return result
}

function getCantonDataByDate(data, canton) {
    var result = {}
    data
        .filter(sample => sample.abbreviation_canton_and_fl == canton)
        .forEach(sample => {
            result[sample.date] = sample
        })
    return result
}

function getCantons(data) {
    var cantons = data.reduce((a, c) => {
        a.add(c.abbreviation_canton_and_fl)
        return a
    }, new Set())
    
    return [...cantons]
}

function formatNumber(n) {
    return new Number(n).toLocaleString('de-CH')
}

function formatDate(d) {
    return `${new Date(d).toLocaleDateString("de-CH")}`
}

function convertCSVToJSON(str, delimiter = ',') {
    const titles = str.slice(0, str.indexOf('\n')).split(delimiter)
    const rows = str.slice(str.indexOf('\n') + 1).split('\n')
    return rows.map(row => {
        const values = row.split(delimiter)
        return titles.reduce((object, curr, i) => (object[curr] = values[i], object), {})
    })
}

function chartSeries(data, label, rgb, alpha) {
    var result = {
        label: label,
        data: data,
        borderColor: [
            `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
        ],
        backgroundColor: [
            `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`
        ],
        borderWidth: 2,
    }
    return result
}

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            point: {
                pointStyle: "line",
                radius: 0
            }
        },
        scales: {
            xAxes: [{
                type: 'time',
                time: {
                    unit: 'month'
                },
                gridLines: {
                    color: 'rgba(255rgba(0, 0, 0, 0.1)'
                }

            }],
            yAxes: [{
                type: 'linear',
                ticks: {
                    maxTicksLimit: 5
                },
                gridLines: {
                    color: 'rgba(255rgba(0, 0, 0, 0.1)'
                }
            }]
        },
        legend: {
            position: 'bottom',
            labels: {usePointStyle: true}
        }
        
    }
}

function getMovingAverage(data, accumulativeField, days) {
    var result = []
    if(data) {
        for(i = days -1 ;i<data.length;i++) {
            var point = {x: data[i].date, y: Math.round((data[i][accumulativeField]-data[i-days+1][accumulativeField])/days)}
            result.push(point)
        }
    }
    return result
}

function parseData(data) {
    var data = convertCSVToJSON(data)
    data.forEach(item => {
        item.date = Date.parse(item.date)
        SAMPLE_DATA_FIELDS_SOURCE.forEach(field => {
            item[field] = parseInt(item[field])
        })
    })
    return data.filter(sample => sample.date) // parsing the CSV gets an empty row at the end
}

function createSeriesData(data, key) {
    return data
        .map(sample => {return {x: sample.date, y: sample[key]}})
}

function addNumericalStats(data) {

    var lastWeekCumulative = data['CH'].map(d => d.ncumul_conf).filter(s => s).slice(-7)
    var priorWeekCumulative = data['CH'].map(d => d.ncumul_conf).filter(s => s).slice(-14)
    var lastWeek = lastWeekCumulative[6]-lastWeekCumulative[0]
    var priorWeek = priorWeekCumulative[6]-priorWeekCumulative[0]

    var lastWeekDeceasedCumulative = data['CH'].map(d => d.ncumul_deceased).filter(s => s).slice(-7)
    var priorWeekDeceasedCumulative = data['CH'].map(d => d.ncumul_deceased).filter(s => s).slice(-14)
    var lastWeekDeceased = lastWeekDeceasedCumulative[6]-lastWeekDeceasedCumulative[0]
    var priorWeekDeceased = priorWeekDeceasedCumulative[6]-priorWeekDeceasedCumulative[0]

    var ncumul_conf = data['CH'].map(d => d.ncumul_conf).filter(s => s).slice(-1)[0]
    var ncumul_deceased = data['CH'].map(d => d.ncumul_deceased).filter(s => s).slice(-1)[0]

    var maxDate = data['CH'].filter(sample => sample.ncumul_conf).reduce((result, current) => Math.max(result, current.date), 0)

    document.getElementById("totalConfirmed").innerHTML = formatNumber(ncumul_conf);
    document.getElementById("last7Days").innerHTML = `<span class="${lastWeek > priorWeek ? "down" : "up"}">${formatNumber(lastWeek)}</span>`
    document.getElementById("totalDeaths").innerHTML = formatNumber(ncumul_deceased)
    document.getElementById("last7Deaths").innerHTML = `<span class="${lastWeekDeceased > priorWeekDeceased ? "down" : "up"}">${formatNumber(lastWeekDeceased)}</span>`
    document.getElementById("maxDate").innerHTML = `${formatDate(maxDate)}`
    }

function addCases(data) {
    var ctx = document.getElementById('cases');

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [ 
                chartSeries(createSeriesData(data['ZH'], 'ncumul_conf'), "ZH", cantonConfig.ZH.color, PROMINENT_SERIES_ALPHA),
                chartSeries(createSeriesData(data['CH'], 'ncumul_conf'), "CH", cantonConfig.CH.color, PROMINENT_SERIES_ALPHA),
            ]
        },
        options: chartOptions()
    });
}

function addDeaths(data) {

    var ctx = document.getElementById('deaths');

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [ 
                chartSeries(getMovingAverage(data['ZH'], 'ncumul_deceased', 7), 'ZH', cantonConfig.ZH.color, PROMINENT_SERIES_ALPHA),
                chartSeries(getMovingAverage(data['CH'], 'ncumul_deceased', 7), 'CH', cantonConfig.CH.color, PROMINENT_SERIES_ALPHA),
            ]
        },
        options: chartOptions()
    });
}

function getCasesPer100k(data, canton) {
    var cases = createSeriesData(data, 'conf', canton)
    return cases.map(point => { return {x: point.x, y: point.y/(cantonConfig[canton].population/100000)}})
}

function per100k(series, canton) {
    return series.map(point => { return {x: point.x, y: point.y/(cantonConfig[canton].population/100000)}})
}

function addCasesPer100000(data) {
    var ctx = document.getElementById('casesPer100000');

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [ 
                chartSeries(per100k(getMovingAverage(data['ZH'], 'ncumul_conf', 7), 'ZH'), 'ZH', cantonConfig.ZH.color, PROMINENT_SERIES_ALPHA),
                chartSeries(per100k(getMovingAverage(data['ZG'], 'ncumul_conf', 7), 'ZG'), 'ZG', cantonConfig.ZG.color, PROMINENT_SERIES_ALPHA),
                chartSeries(per100k(getMovingAverage(data['GR'], 'ncumul_conf', 7), 'GR'), 'GR', cantonConfig.GR.color, PROMINENT_SERIES_ALPHA),
                chartSeries(per100k(getMovingAverage(data['CH'], 'ncumul_conf', 7), 'CH'), 'CH', cantonConfig.CH.color, PROMINENT_SERIES_ALPHA),
            ]
        },
        options: chartOptions()
    });
}

function addHospital(data) {
    var ctx = document.getElementById('hospitalized');

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                chartSeries(createSeriesData(data['ZH'], 'current_hosp'), 'Hospitalized', [252, 191, 73], PROMINENT_SERIES_ALPHA),
                chartSeries(createSeriesData(data['ZH'], 'current_icu'), 'ICU', [247, 127, 0], PROMINENT_SERIES_ALPHA),
                chartSeries(createSeriesData(data['ZH'], 'current_vent'), 'Ventilated', [214, 40, 40], PROMINENT_SERIES_ALPHA),
            ]
        },
        options: chartOptions()
    });
}

function outputDebug(newData) {
}

//TODO: could do two fetches in parallel
function init() {

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        var element = document.body;
        element.classList.remove("light");
        element.classList.add("dark");
    } else {
        var element = document.body;
        element.classList.add("light");
        element.classList.remove("dark");
    }
    fetch('cantonConfig.json')
        .then(r =>   r.json())
        .then(r => cantonConfig = r)
        // .then(x => { return fetch('unittest.csv')})
        // .then(x => { return fetch('data.csv')})
        .then(x => { return fetch('https://raw.githubusercontent.com/openZH/covid_19/master/COVID19_Fallzahlen_CH_total_v2.csv')})
        .then(r => r.text())
        .then(csvData => {
            newData = parseData(csvData)
            newData = scaffoldData(newData)
            console.log(newData['CH'])
            addNumericalStats(newData)
            addCasesPer100000(newData)
            addCases(newData)
            addHospital(newData)
            addDeaths(newData)
            outputDebug(newData)
        })
}

init()