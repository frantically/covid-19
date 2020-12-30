import { CoronaStatistics, SERIES_HOSPITALIZED, SERIES_ICU, SERIES_VENTILATED } from './openzh.js'
import { FOPHCoronaStatistics } from './foph.js'
import { csvStringToJson, formatDate, formatNumber } from './utils.js'

var cantonConfig = {}

//TOOD: WHY ARE DEATHS LOWER, IS THIS CORRECT?
//TODO: SHOULD I COMBINE DATA FOR FOPH INTO A SINGLE CSV AND ACCESS BY SERIES TYPE AS PER OpenZH?

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

function cantonChartSeries(data, canton) {
    return chartSeries(data, canton, cantonConfig[canton].color)
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

function addNumber(element, number) {
    document.getElementById(element).innerHTML = formatNumber(number)
}

function addNumberAndPercentMove(element, number, percentMove){
    document.getElementById(element).innerHTML = `<span class="${percentMove > 0 ? "down" : "up"}">${formatNumber(number)} <span class="highlightChange">${Math.round(percentMove)}%</span></span>`
}

function addHospital(data) {
    addChart('hospitalized', [
            chartSeries(data.getSeries('ZH', SERIES_HOSPITALIZED), 'Hospitalized', [252, 191, 73]),
            chartSeries(data.getSeries('ZH', SERIES_ICU), 'ICU', [247, 127, 0]),
            chartSeries(data.getSeries('ZH', SERIES_VENTILATED), 'Ventilated', [214, 40, 40]),
        ],
        chartOptions())
}

function addRe(data) {


    var zh = data.getReDataSeries("ZH").slice(-30)
    var zg = data.getReDataSeries("ZG").slice(-30)
    var gr = data.getReDataSeries("GR").slice(-30)
    var ch = data.getReDataSeries("CH").slice(-30)

    //TODO: Is there a neater way to set a narrow yAxis range? suggestedMax/Min create a chart with a much wider range, even if the stepSize is 0.1
    var all = [zh, zg, gr, ch].flat().map(s => s.y)
    var chartOptions = chartOptionsSmall()
    chartOptions.scales.yAxes[0].ticks.stepSize = 0.1
    chartOptions.scales.yAxes[0].ticks.min = Math.floor(Math.min(...all)*10)/10
    chartOptions.scales.yAxes[0].ticks.max = Math.ceil(Math.max(...all)*10)/10

    addChart('chartRe', [
            cantonChartSeries(zh, 'ZH'),
            cantonChartSeries(zg, 'ZG'),
            cantonChartSeries(gr, 'GR'),
            cantonChartSeries(ch, 'CH'),
        ],
        chartOptions)
}

function addFOPHDeaths(data) {
    var chTotal = data.getTotalDataSeries("CH")
    addNumber("totalDeaths", chTotal[chTotal.length - 1].y)

    var lastWeek = data.getLastWeekTotal("CH")
    var weekOnWeek = data.getLastWeekOnWeekPercentage("CH")
    addNumberAndPercentMove("last7Deaths", lastWeek, weekOnWeek)

    addChart('deaths', [
            cantonChartSeries(data.get7DayAverageDataSeries("ZH"), 'ZH'),
            cantonChartSeries(data.get7DayAverageDataSeries("CH"), 'CH'),
        ],
        chartOptions())
}

function addFOPHCases(data) {

    var zhTotal = data.getTotalDataSeries("ZH")
    var chTotal = data.getTotalDataSeries("CH")

    addNumber("totalConfirmed", chTotal[chTotal.length - 1].y)
    document.getElementById("maxDate").innerHTML = `CH Latest: ${formatDate(data.getMaxDate("CH"))}`

    var lastWeek = data.getLastWeekTotal("CH")
    var weekOnWeek = data.getLastWeekOnWeekPercentage("CH")
    addNumberAndPercentMove("last7Days", lastWeek, weekOnWeek)

    addChart('cases', [
        cantonChartSeries(zhTotal, 'ZH'),
        cantonChartSeries(chTotal, 'CH'),
        ],
        chartOptions())

    var zh = data.getCasesPer100kDataSeries("ZH")
    var zg = data.getCasesPer100kDataSeries("ZG")
    var gr = data.getCasesPer100kDataSeries("GR")
    var ch = data.getCasesPer100kDataSeries("CH")

    addChart('casesPer100000', [
        cantonChartSeries(zh, 'ZH'),
        cantonChartSeries(zg, 'ZG'),
        cantonChartSeries(gr, 'GR'),
        cantonChartSeries(ch, 'CH'),
        ],
        chartOptions())

    addChart('chartCasesLastMonth', [
        cantonChartSeries(zh.slice(-30), 'ZH'),
        cantonChartSeries(zg.slice(-30), 'ZG'),
        cantonChartSeries(gr.slice(-30), 'GR'),
        cantonChartSeries(ch.slice(-30), 'CH'),
        ],
        chartOptionsSmall())
}

function outputDebug(data) {
    console.log(data.getData('CH'))
}

function loadCantonConfig() {
    return fetch('cantonConfig.json')
        .then(r =>   r.json())
        .then(r => cantonConfig = r)
}

function initOpenZH() {
    fetch('https://raw.githubusercontent.com/openZH/covid_19/master/COVID19_Fallzahlen_CH_total_v2.csv')
        .then(r => r.text())
        .then(csvData => {
            var data = new CoronaStatistics(csvStringToJson(csvData))
            outputDebug(data)
            addHospital(data)
        })
}

function loadFOPHData(url, callback) {
    return fetch(url)
        .then(r => r.text())
        .then(str => csvStringToJson(str))
        .then(data => new FOPHCoronaStatistics(data, cantonConfig))
}

function initFOPH() {
    fetch('https://www.covid19.admin.ch/api/data/context')
        .then(r => r.json())
        .then(context => 
            { return Promise.all([
                loadFOPHData(context.sources.individual.csv.daily.re),
                loadFOPHData(context.sources.individual.csv.daily.death),
                loadFOPHData(context.sources.individual.csv.daily.cases)
            ])}
        )
        .then(data => {
            addRe(data[0])
            addFOPHDeaths(data[1])
            addFOPHCases(data[2])
        })
}

function init() {
    loadCantonConfig()
        .then(() => {
            initOpenZH()
            initFOPH()
        })
}

init()