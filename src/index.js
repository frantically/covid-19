import { CoronaStatistics, csvStringToJson, openZHExtractor, formatDate, SERIES_CASES, SERIES_DEATHS, SERIES_HOSPITALIZED, SERIES_ICU, SERIES_VENTILATED } from './data.js'

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

function chartOptions(xAxisUnit = 'month') {

    var style = getComputedStyle(document.body)
    var gridLineColor = style.getPropertyValue('--gridlines')


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
                    unit: xAxisUnit
                },
                gridLines: {
                    color: gridLineColor,
                    zeroLineColor: gridLineColor,
                }
            }],
            yAxes: [{
                type: 'linear',
                ticks: {
                    maxTicksLimit: 5
                },
                gridLines: {
                    color: gridLineColor,
                    zeroLineColor: gridLineColor,
                }   
            }]
        },
        legend: {
            position: 'bottom',
            labels: {usePointStyle: true}
        }
        
    }
}

function chartOptionsSmall() {
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
                display: false,
                type: 'time',
            }],
            yAxes: [{
                display: true,
                type: 'linear',
                ticks: {
                    maxTicksLimit: 3
                },
            }]
        },
        legend: {
            display: false,
            position: 'bottom',
            labels: {usePointStyle: true}
        }
       
    }
}

function addNumericalStats(data) {

    var lastWeek = data.getLastWeek('CH', SERIES_CASES)
    var priorWeek = data.getPriorWeek('CH', SERIES_CASES)
    var casesMovePercentage = Math.round(((lastWeek-priorWeek)/priorWeek)*100)

    var lastWeekDeceased = data.getLastWeek('CH', SERIES_DEATHS)
    var priorWeekDeceased = data.getPriorWeek('CH', SERIES_DEATHS)
    var deathsMovePercentage = Math.round(((lastWeekDeceased-priorWeekDeceased)/priorWeekDeceased)*100)

    var ncumul_conf = data.getLastValue('CH', SERIES_CASES)
    var ncumul_deceased = data.getLastValue('CH', SERIES_DEATHS)

    var maxDate = data.getMaxDate('CH')

    document.getElementById("totalConfirmed").innerHTML = formatNumber(ncumul_conf);
    document.getElementById("last7Days").innerHTML = `<span class="${lastWeek > priorWeek ? "down" : "up"}">${formatNumber(lastWeek)} <span class="highlightChange">${casesMovePercentage}%</span></span>`
    document.getElementById("totalDeaths").innerHTML = formatNumber(ncumul_deceased)
    document.getElementById("last7Deaths").innerHTML = `<span class="${lastWeekDeceased > priorWeekDeceased ? "down" : "up"}">${formatNumber(lastWeekDeceased)} <span class="highlightChange">${deathsMovePercentage}%</span></span>`
    document.getElementById("maxDate").innerHTML = `CH Latest: ${formatDate(maxDate)}`
}

function addChart(element, dataSeries, options) {
    var ctx = document.getElementById(element);

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: dataSeries
        },
        options: options
    });
}

function per100k(series, canton) {
    return series.map(point => { return {x: point.x, y: point.y/(cantonConfig[canton].population/100000)}})
}

function addCases(data) {
    addChart('cases', [ 
            chartSeries(data.getSeries('ZH', SERIES_CASES), "ZH", cantonConfig.ZH.color, 1),
            chartSeries(data.getSeries('CH', SERIES_CASES), "CH", cantonConfig.CH.color, 1),
        ],
        chartOptions())
}

function addDeaths(data) {
    addChart('deaths', [ 
            chartSeries(data.getMovingAverage('ZH', SERIES_DEATHS, 7), 'ZH', cantonConfig.ZH.color),
            chartSeries(data.getMovingAverage('CH', SERIES_DEATHS, 7), 'CH', cantonConfig.CH.color),
        ],
        chartOptions())
}

function addCasesPer100000(data) {
    addChart('casesPer100000', [
            chartSeries(per100k(data.getMovingAverage('ZH', SERIES_CASES, 7), 'ZH'), 'ZH', cantonConfig.ZH.color),
            chartSeries(per100k(data.getMovingAverage('ZG', SERIES_CASES, 7), 'ZG'), 'ZG', cantonConfig.ZG.color),
            chartSeries(per100k(data.getMovingAverage('GR', SERIES_CASES, 7), 'GR'), 'GR', cantonConfig.GR.color),
            chartSeries(per100k(data.getMovingAverage('CH', SERIES_CASES, 7), 'CH'), 'CH', cantonConfig.CH.color),
        ],
        chartOptions())
}

function addHospital(data) {
    addChart('hospitalized', [
            chartSeries(data.getSeries('ZH', SERIES_HOSPITALIZED), 'Hospitalized', [252, 191, 73]),
            chartSeries(data.getSeries('ZH', SERIES_ICU), 'ICU', [247, 127, 0]),
            chartSeries(data.getSeries('ZH', SERIES_VENTILATED), 'Ventilated', [214, 40, 40]),
        ],
        chartOptions())
}

function addCasesLastMonth(data) {
    addChart('chartCasesLastMonth', [
        chartSeries(per100k(data.getMovingAverage('ZH', SERIES_CASES, 7).slice(-30), 'ZH'), 'ZH', cantonConfig.ZH.color),
        chartSeries(per100k(data.getMovingAverage('ZG', SERIES_CASES, 7).slice(-30), 'ZG'), 'ZG', cantonConfig.ZG.color),
        chartSeries(per100k(data.getMovingAverage('GR', SERIES_CASES, 7).slice(-30), 'GR'), 'GR', cantonConfig.GR.color),
        chartSeries(per100k(data.getMovingAverage('CH', SERIES_CASES, 7).slice(-30), 'CH'), 'CH', cantonConfig.CH.color),
    ],
    chartOptionsSmall())
}

function addDeathsLastMonth(data) {
    addChart('chartDeathsLastMonth', [
        chartSeries(data.getMovingAverage('ZH', SERIES_DEATHS, 7).slice(-30), 'ZH', cantonConfig.ZH.color),
        chartSeries(data.getMovingAverage('CH', SERIES_DEATHS, 7).slice(-30), 'CH', cantonConfig.CH.color),
    ],
    chartOptionsSmall())
}

function addRe(sourceData) {
    var data = csvStringToJson(sourceData, fophExtractor).filter(sample => sample.re)
    var zh = data.filter(d => d.location === "ZH").map(sample => {return {x: sample.date, y: sample.re}}).slice(-30)
    var zg = data.filter(d => d.location === "ZG").map(sample => {return {x: sample.date, y: sample.re}}).slice(-30)
    var gr = data.filter(d => d.location === "GR").map(sample => {return {x: sample.date, y: sample.re}}).slice(-30)
    var ch = data.filter(d => d.location === "CH").map(sample => {return {x: sample.date, y: sample.re}}).slice(-30)

    var chartOptions = chartOptionsSmall()
    chartOptions.scales.yAxes[0].ticks.suggestedMax = 1.1
    chartOptions.scales.yAxes[0].ticks.suggestedMin = 0.9

    addChart('chartRe', [
            chartSeries(zh, 'ZH', cantonConfig.ZH.color),
            chartSeries(zg, 'ZG', cantonConfig.ZG.color),
            chartSeries(gr, 'GR', cantonConfig.GR.color),
            chartSeries(ch, 'CH', cantonConfig.CH.color),
        ],
        chartOptions)
}

function outputDebug(data) {
    console.log(data.getData('CH'))
}

function isLightTheme() {
    var url = new URL(location.href);
    var themeOverride = url.searchParams.get("theme");
    var light = true
    if(themeOverride) {
        if(themeOverride === "dark") {
            light = false
        }
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        light = false
    }
    return light
}

function applyTheme() {
    var element = document.body;
    if (isLightTheme()) {
        element.classList.add("light");
        element.classList.remove("dark");
    } else {
        element.classList.remove("light");
        element.classList.add("dark");
    }
}

function init() {
    
    //applyTheme()
    fetch('cantonConfig.json')
        .then(r =>   r.json())
        .then(r => cantonConfig = r)
        // .then(x => { return fetch('unittest.csv')})
        .then(x => { return fetch('https://raw.githubusercontent.com/openZH/covid_19/master/COVID19_Fallzahlen_CH_total_v2.csv')})
        .then(r => r.text())
        .then(csvData => {
            var data = new CoronaStatistics(csvStringToJson(csvData, openZHExtractor))
            outputDebug(data)
            addNumericalStats(data)
            addCasesPer100000(data)
            addDeaths(data)
            addCases(data)
            addHospital(data)
            addCasesLastMonth(data)
            // addDeathsLastMonth(data)
        })
        .then(x => initFoph()) //need to know the canton config is loaded. perhaps put this in a module?
}

function initFoph() {
    fetch('https://www.covid19.admin.ch/api/data/context')
        .then(r => r.json())
        .then(context => fetch(context.sources.individual.csv.daily.re).then(r => r.text()))
        .then(data => addRe(data))
}

function fophExtractor(source) {
    return {
        key: `${source.geoRegion}_${source.date}`,
        location: source.geoRegion,
        date: Date.parse(source.date),
        re: parseFloat(source.median_R_mean)
    }
}

init()