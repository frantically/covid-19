const PROMINENT_SERIES_ALPHA = 1
const DEFAULT_SERIES_ALPHA = 0.5

const SAMPLE_DATA_FIELDS_SOURCE = ["ncumul_tested" , "ncumul_conf" , "new_hosp" , "current_hosp", "current_icu" , "current_vent" , "ncumul_released" , "ncumul_deceased", "current_isolated", "current_quarantined" , "current_quarantined_riskareatravel", "current_quarantined_total" ]
const SAMPLE_DATA_FIELDS_ALL = SAMPLE_DATA_FIELDS_SOURCE.concat(["conf", "deceased"])

var cantonConfig = {}

function formatNumber(n) {
    return new Number(n).toLocaleString('de-CH')
}

function formatDate(d) {
    return `${new Date(d).toLocaleDateString("de-CH")}`
}

function projectIncompleteData(data) {
    var maxDate = data.reduce((a, c) => Math.max(a, c.date), Date.parse("2020-01-01"))
    var cantons = data.reduce((a, c) => {
        a.add(c.abbreviation_canton_and_fl)
        return a
    }, new Set())
    
    cantons = [...cantons]

    var missingEndDateSamples = cantons
        .map(canton => {
            var cantonData = data.filter(sample => sample.abbreviation_canton_and_fl == canton)
            return cantonData[cantonData.length - 1]
        })
        .filter(cantonMax => cantonMax.date < maxDate)
        .map(cantonMax => {
            return {abbreviation_canton_and_fl: cantonMax.abbreviation_canton_and_fl, date: maxDate}
        })
    data = data.concat(missingEndDateSamples)

    var mostRecentSampleValuesByCanton = {}
    cantons
        .map(canton => data.filter(sample => sample.abbreviation_canton_and_fl == canton))
        .map(cantonData => {
            var result = {}
            cantonData.forEach(sample => {
                SAMPLE_DATA_FIELDS_ALL.forEach(field => {
                    result[field] = isNaN(sample[field]) ? result[field] : sample[field]
                })
            })
            result.abbreviation_canton_and_fl = cantonData[0].abbreviation_canton_and_fl
            result.date = maxDate
            return result
        })
        .forEach(carryForward => {mostRecentSampleValuesByCanton[carryForward.abbreviation_canton_and_fl] = carryForward})
    
    //now apply the carry forwards to the last sample for a canton
    cantons
        .map(canton => {
            var cantonData = data.filter(sample => sample.abbreviation_canton_and_fl == canton)
            return cantonData[cantonData.length - 1]
        })
        .forEach(cantonMax =>{
            SAMPLE_DATA_FIELDS_ALL.forEach(field => {
                cantonMax[field] = isNaN(cantonMax[field]) ? mostRecentSampleValuesByCanton[cantonMax.abbreviation_canton_and_fl][field] : cantonMax[field]
            })
        })
    return data
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
    //return Object.values(result) //need a way to project forward on most recent data - look for max and add in?
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

    var maxDate = data.reduce((result, current) => Math.max(result, current.date), 0)

    document.getElementById("totalConfirmed").innerHTML = formatNumber(ncumul_conf[ncumul_conf.length-1].y);
    document.getElementById("last7Days").innerHTML = `<span class="${lastWeek > priorWeek ? "down" : "up"}">${formatNumber(lastWeek)}</span>`
    document.getElementById("totalDeaths").innerHTML = formatNumber(ncumul_deceased[ncumul_deceased.length-1].y)
    document.getElementById("last7Deaths").innerHTML = `<span class="${lastWeekDeaths > priorWeekDeaths ? "down" : "up"}">${formatNumber(lastWeekDeaths)}</span>`
    document.getElementById("maxDate").innerHTML = `${formatDate(maxDate)}`
    }

function addCases(data) {
    var ctx = document.getElementById('cases');

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [ 
                chartSeries(createSeriesData(data, 'ncumul_conf', 'ZH'), "ZH", cantonConfig.ZH.color, PROMINENT_SERIES_ALPHA),
                chartSeries(createSeriesData(data, 'ncumul_conf', 'CH'), "CH", cantonConfig.CH.color, PROMINENT_SERIES_ALPHA),
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
                chartSeries(createSeriesData(data, 'deceased', 'ZH'), "ZH", cantonConfig.ZH.color, PROMINENT_SERIES_ALPHA),
                chartSeries(createSeriesData(data, 'deceased', 'CH'), "CH", cantonConfig.CH.color, PROMINENT_SERIES_ALPHA),
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
                chartSeries(createSeriesData(data, 'current_hosp', 'ZH'), 'Hospitalized', [252, 191, 73], PROMINENT_SERIES_ALPHA), 
                chartSeries(createSeriesData(data, 'current_icu', 'ZH'), 'ICU', [247, 127, 0], PROMINENT_SERIES_ALPHA),
                chartSeries(createSeriesData(data, 'current_vent', 'ZH'), 'Ventilated', [214, 40, 40], PROMINENT_SERIES_ALPHA),
            ]
        },
        options: chartOptions()
    });
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
        // .then(x => { return fetch('data.csv')})
        .then(x => { return fetch('https://raw.githubusercontent.com/openZH/covid_19/master/COVID19_Fallzahlen_CH_total_v2.csv')})
        .then(r => r.text())
        .then(data => {
            data = parseData(data)
            data = data.concat(createCHData(data))
            data = projectIncompleteData(data)
            addNumericalStats(data)
            addCases(data)
            addCasesPer100000(data)
            addHospital(data)
            addDeaths(data)
        })
}

init()