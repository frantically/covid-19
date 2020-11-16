// TODO
// Canton selector?
// hospitalization - how to show cantons?
// hospitalization - colors
// all cases
// tear drop

const PROMINENT_SERIES_ALPHA = 1
const DEFAULT_SERIES_ALPHA = 0.5

const SAMPLE_DATA_FIELDS_SOURCE = ["ncumul_tested" , "ncumul_conf" , "new_hosp" , "current_hosp", "current_icu" , "current_vent" , "ncumul_released" , "ncumul_deceased", "current_isolated", "current_quarantined" , "current_quarantined_riskareatravel", "current_quarantined_total" ]
const SAMPLE_DATA_FIELDS_ALL = SAMPLE_DATA_FIELDS_SOURCE.concat(["conf", "deceased"])
var cantonConfig = {}

function formatNumber(n) {
    return new Number(n).toLocaleString('de-CH')
}

function createCHData(data) {
    var result = data.reduce((result, sample) => {
        var dateResult = result[sample.date]
        if(!dateResult) {
            dateResult = {
                date: sample.date,
                abbreviation_canton_and_fl: "CH",
                samples: 0
            }
            result[sample.date] = dateResult
        }
        result[sample.date] = dateResult //TODO: can this be done only if null in the line above?

        SAMPLE_DATA_FIELDS_ALL.forEach(field => {
            dateResult[field] = (dateResult[field]?dateResult[field]+sample[field]:sample[field])
        })
        dateResult.samples++
        return result
    }, {})
    return Object.values(result).filter(sample => sample.samples > 23)
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
                }
            }],
            yAxes: [{
                type: 'linear',
                ticks: {
                    maxTicksLimit: 5
                }
                
            }]
        },
        legend: {
            position: 'bottom',
            labels: {usePointStyle: true}
        }
        
    }
}

function getMovingAverage(series, days) {
    var movingAverage = []
    return series
        .map(point => {
            movingAverage.push(point.y)
            while(movingAverage.length > days) {
                movingAverage.shift()
            }
            if(movingAverage.length == days) {
                return {x: point.x, y: movingAverage.reduce((a, c) => a+c, 0)/days}
            } else {
                return {x: point.x, y: NaN}
            }
        })
}

//TODO: Move accumulation -> conf into a generic function?
function parseData(data) {
    var data = convertCSVToJSON(data)
    var previous_ncumul_conf = {}
    var previous_ncumul_deceased = {}
    data.forEach(item => {
        item.date = Date.parse(item.date)
        SAMPLE_DATA_FIELDS_SOURCE.forEach(field => {
            item[field] = parseInt(item[field])
        })
        var previousConf = previous_ncumul_conf[item.abbreviation_canton_and_fl] || 0
        item.conf = item.ncumul_conf - previousConf
        previous_ncumul_conf[item.abbreviation_canton_and_fl] = item.ncumul_conf

        var previousDeceased = previous_ncumul_deceased[item.abbreviation_canton_and_fl] || 0
        item.deceased = item.ncumul_deceased - previousDeceased
        previous_ncumul_deceased[item.abbreviation_canton_and_fl] = item.ncumul_deceased
    })
    return data.filter(sample => sample.date) // parsing the CSV gets an empty row at the end
}

function createSeriesData(data, key, canton) {
    return data
        .filter(sample => sample.abbreviation_canton_and_fl == canton)
        .map(sample => {return {x: sample.date, y: sample[key] < 0 ? 0 : sample[key]}})
}

function addNumericalStats(data) {
    var conf = createSeriesData(data, 'conf', 'CH')
    var ncumul_conf = createSeriesData(data, 'ncumul_conf', 'CH')

    var deceased = createSeriesData(data, 'deceased', 'CH')
    var ncumul_deceased = createSeriesData(data, 'ncumul_deceased', 'CH')

    var lastWeek = conf.slice(-7).map(e => e.y).reduce((a, c) => a+c, 0)
    var priorWeek = conf.slice(-14).map(e => e.y).reduce((a, c) => a+c, 0) - lastWeek

    var lastWeekDeaths = deceased.slice(-7).map(e => e.y).reduce((a, c) => a+c, 0)
    var priorWeekDeaths = deceased.slice(-14).map(e => e.y).reduce((a, c) => a+c, 0) - lastWeekDeaths

    var maxDate = data.filter(sample => sample.abbreviation_canton_and_fl == "CH").reduce((result, current) => {
        return Math.max(result, current.date)
    }, 0)

    var maxZurichDate = data.filter(sample => (sample.abbreviation_canton_and_fl == "ZH" && sample.ncumul_conf)).reduce((result, current) => {
        return Math.max(result, current.date)
    }, 0)

    document.getElementById("totalConfirmed").innerHTML = formatNumber(ncumul_conf[ncumul_conf.length-1].y);
    document.getElementById("last7Days").innerHTML = `<span class="${lastWeek > priorWeek ? "down" : "up"}">${formatNumber(lastWeek)}</span>`
    document.getElementById("totalDeaths").innerHTML = formatNumber(ncumul_deceased[ncumul_deceased.length-1].y)
    document.getElementById("last7Deaths").innerHTML = `<span class="${lastWeekDeaths > priorWeekDeaths ? "down" : "up"}">${formatNumber(lastWeekDeaths)}</span>`
    document.getElementById("maxDate").innerHTML = `${new Date(maxDate).toLocaleDateString("de-CH")}`
    document.getElementById("maxDateZH").innerHTML = `${new Date(maxZurichDate).toLocaleDateString("de-CH")}`
}

function addCases(data) {
    var ctx = document.getElementById('cases');

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [ 
                chartSeries(getMovingAverage(createSeriesData(data, 'conf', 'ZH'), 7), "ZH", cantonConfig.ZH.color, PROMINENT_SERIES_ALPHA),
                chartSeries(getMovingAverage(createSeriesData(data, 'conf', 'CH'), 7), "CH", cantonConfig.CH.color, PROMINENT_SERIES_ALPHA),
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
                chartSeries(getMovingAverage(createSeriesData(data, 'deceased', 'ZH'), 7), "ZH", cantonConfig.ZH.color, PROMINENT_SERIES_ALPHA),
                chartSeries(getMovingAverage(createSeriesData(data, 'deceased', 'CH'), 7), "CH", cantonConfig.CH.color, PROMINENT_SERIES_ALPHA),
            ]
        },
        options: chartOptions()
    });
}

function getCasesPer100k(data, canton) {
    var cases = createSeriesData(data, 'conf', canton)
    return cases.map(point => { return {x: point.x, y: point.y/(cantonConfig[canton].population/100000)}})
}

function addCasesPer100000(data) {

    console.log(getMovingAverage(getCasesPer100k(data, "ZH"), 7))

    var ctx = document.getElementById('casesPer100000');

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [ 
                chartSeries(getMovingAverage(getCasesPer100k(data, "ZH"), 7), "ZH", cantonConfig.ZH.color, PROMINENT_SERIES_ALPHA),
                chartSeries(getMovingAverage(getCasesPer100k(data, "ZG"), 7), "ZG", cantonConfig.ZG.color, PROMINENT_SERIES_ALPHA),
                chartSeries(getMovingAverage(getCasesPer100k(data, "GR"), 7), "GR", cantonConfig.GR.color, PROMINENT_SERIES_ALPHA),
                chartSeries(getMovingAverage(getCasesPer100k(data, "CH"), 7), "CH", cantonConfig.CH.color, PROMINENT_SERIES_ALPHA),
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
                chartSeries(createSeriesData(data, 'current_hosp', 'ZH'), 'Hospitalized', [0, 0, 0], PROMINENT_SERIES_ALPHA), 
                chartSeries(createSeriesData(data, 'current_vent', 'ZH'), 'Ventilated', [55, 55, 55], PROMINENT_SERIES_ALPHA),
                chartSeries(createSeriesData(data, 'current_icu', 'ZH'), 'ICT', [110, 110, 110], PROMINENT_SERIES_ALPHA)
            ]
        },
        options: chartOptions()
    });
}

//TODO: could do two fetches in parallel
function init() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        console.log('dark mode')
    } else {
        console.log('light mode')
    }
    fetch('cantonConfig.json')
        .then(r =>   r.json())
        .then(r => cantonConfig = r)
        //.then(x => { return fetch('data.csv')})
        .then(x => { return fetch('https://raw.githubusercontent.com/openZH/covid_19/master/COVID19_Fallzahlen_CH_total_v2.csv')})
        .then(r => r.text())
        .then(data => {
            data = parseData(data)
            data = data.concat(createCHData(data))
            addNumericalStats(data)
            addCases(data)
            addCasesPer100000(data)
            addHospital(data)
            addDeaths(data)
        })
}

init()