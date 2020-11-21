import { createDataFromCSV, formatDate, getMovingAverage, createSeriesData } from './data.js'

var cantonConfig = {}

function formatNumber(n) {
    return new Number(n).toLocaleString('de-CH')
}

function chartSeries(data, label, rgb, alpha = 1) {
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
    document.getElementById("maxDate").innerHTML = `CH Latest: ${formatDate(maxDate)}`
    }

function addCases(data) {
    var ctx = document.getElementById('cases');

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [ 
                chartSeries(createSeriesData(data['ZH'], 'ncumul_conf'), "ZH", cantonConfig.ZH.color, 1),
                chartSeries(createSeriesData(data['CH'], 'ncumul_conf'), "CH", cantonConfig.CH.color, 1),
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
                chartSeries(getMovingAverage(data['ZH'], 'ncumul_deceased', 7), 'ZH', cantonConfig.ZH.color),
                chartSeries(getMovingAverage(data['CH'], 'ncumul_deceased', 7), 'CH', cantonConfig.CH.color),
            ]
        },
        options: chartOptions()
    });
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
                chartSeries(per100k(getMovingAverage(data['ZH'], 'ncumul_conf', 7), 'ZH'), 'ZH', cantonConfig.ZH.color),
                chartSeries(per100k(getMovingAverage(data['ZG'], 'ncumul_conf', 7), 'ZG'), 'ZG', cantonConfig.ZG.color),
                chartSeries(per100k(getMovingAverage(data['GR'], 'ncumul_conf', 7), 'GR'), 'GR', cantonConfig.GR.color),
                chartSeries(per100k(getMovingAverage(data['CH'], 'ncumul_conf', 7), 'CH'), 'CH', cantonConfig.CH.color),
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
                chartSeries(createSeriesData(data['ZH'], 'current_hosp'), 'Hospitalized', [252, 191, 73]),
                chartSeries(createSeriesData(data['ZH'], 'current_icu'), 'ICU', [247, 127, 0]),
                chartSeries(createSeriesData(data['ZH'], 'current_vent'), 'Ventilated', [214, 40, 40]),
            ]
        },
        options: chartOptions()
    });
}

function outputDebug(newData) {
}

function applyTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        var element = document.body;
        element.classList.remove("light");
        element.classList.add("dark");
    } else {
        var element = document.body;
        element.classList.add("light");
        element.classList.remove("dark");
    }
}

//TODO: could do two fetches in parallel
function init() {
    
    applyTheme()
    fetch('cantonConfig.json')
        .then(r =>   r.json())
        .then(r => cantonConfig = r)
        // .then(x => { return fetch('unittest.csv')})
        .then(x => { return fetch('https://raw.githubusercontent.com/openZH/covid_19/master/COVID19_Fallzahlen_CH_total_v2.csv')})
        .then(r => r.text())
        .then(csvData => {
            var data = createDataFromCSV(csvData)
            console.log(data['CH'])
            addNumericalStats(data)
            addCasesPer100000(data)
            addCases(data)
            addHospital(data)
            addDeaths(data)
            outputDebug(data)
        })
}

init()