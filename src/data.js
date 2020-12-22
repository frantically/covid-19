const SAMPLE_DATA_FIELDS_SOURCE = ["ncumul_tested" , "ncumul_conf" , "new_hosp" , "current_hosp", "current_icu" , "current_vent" , "ncumul_released" , "ncumul_deceased", "current_isolated", "current_quarantined" , "current_quarantined_riskareatravel", "current_quarantined_total" ]
const SAMPLE_DATA_FIELDS_CARRY = ["ncumul_conf", "ncumul_deceased", "current_hosp"]
const SAMPLE_DATA_FIELDS_ALL_NEW = SAMPLE_DATA_FIELDS_SOURCE.concat(["ncumul_conf_raw", "ncumul_deceased_raw", "raw"])

const ONE_DAY = 24 * 60 * 60 * 1000
const MIN_START_DATE = Date.parse("2020-03-01")

export function formatDate(d) {
    return `${new Date(d).toLocaleDateString("de-CH")}`
}

export class CoronaStatistics {

    _data = {}

    constructor(csvData) {
        this._data = this._createDataFromCSV(csvData)
    }

    _scaffoldData(source) {
        var minMax = source.reduce((a, c) => {
            c.raw = 1 // leverage the minMax calculation to add a new attribute to show raw values - unclear code
            a.min = Math.min(c.date, a.min)
            a.max = Math.max(c.date, a.max)
            return a
        }, {min: Number.MAX_VALUE , max: 0})
        minMax.min = Math.max(MIN_START_DATE, minMax.min)

        console.log(`Date Range in data: ${formatDate(minMax.min)} - ${formatDate(minMax.max)}`)
        var days = []
        for(var i = minMax.min;i<= minMax.max;i = i+ONE_DAY) {
            days.push(i)
        }
        var cantons = this._getCantons(source)
        var result = {}
        cantons.forEach(canton => {
            var cantonData = this._getCantonDataByDate(source, canton)
            var cantonScaffoldedData = days.map(date => {
                return cantonData[date] ? cantonData[date] : {date: date, abbreviation_canton_and_fl: canton, raw: 0}
            })
            result[canton] = cantonScaffoldedData
        })
        this._carryForwardAccumlatedValues(result)
        result['CH'] = this._aggregateCH(result)
        return result
    }

    _carryForwardAccumlatedValues(data) {
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

    _aggregateCH(data) {
        var cantonsData = Object.values(data)
        var sampleCount = cantonsData[0].length
        var result = []
        for(var i=0;i<sampleCount;i++) {
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

    _getCantonDataByDate(data, canton) {
        var result = {}
        data
            .filter(sample => sample.abbreviation_canton_and_fl == canton)
            .forEach(sample => {
                result[sample.date] = sample
            })
        return result
    }

    _getCantons(data) {
        var cantons = data.reduce((a, c) => {
            a.add(c.abbreviation_canton_and_fl)
            return a
        }, new Set())
        
        return [...cantons]
    }

    _convertCSVToJSON(str, delimiter = ',') {
        const titles = str.slice(0, str.indexOf('\n')).split(delimiter)
        const rows = str.slice(str.indexOf('\n') + 1).split('\n').map(s => s.replace(/[\x00-\x1F\x7F-\x9F]/g, ""))
        return rows.map(row => {
            const values = row.split(delimiter)
            return titles.reduce((object, curr, i) => (object[curr] = values[i], object), {})
        })
    }

    _createDataFromCSV(data) {
        var result = this._convertCSVToJSON(data)
        result.forEach(item => {
            item.date = Date.parse(item.date)
            SAMPLE_DATA_FIELDS_SOURCE.forEach(field => {
                item[field] = parseInt(item[field])
            })
        })
        //console.log(result)
        result = result.filter(sample => sample.date) // parsing the CSV gets an empty row at the end
        return this._scaffoldData(result)
    }

    //TODO: REMOVE THIS AS IT'S A SIGN OF OTHER METHODS MISSING LIKE getMovingAverage
    getData(canton) {
        return this._data[canton]
    }

    getSeries(canton, key) {
        return this._data[canton]
            .map(sample => {return {x: sample.date, y: sample[key]}})
    }

    getMovingAverage(canton, accumulativeField, days) {
        var data = this._data[canton]
        var result = []
        if(data) {
            for(var i = days -1 ;i<data.length;i++) {
                var point = {x: data[i].date, y: Math.round((data[i][accumulativeField]-data[i-days+1][accumulativeField])/days)}
                result.push(point)
            }
        }
        return result
    }

    getMaxDate(canton) {
        return this._data[canton].filter(sample => sample.ncumul_conf).reduce((result, current) => Math.max(result, current.date), 0)
    }

    getSeriesChange(canton, field, start, end = undefined) {
        var cantonData = this._data[canton]
        var slice = cantonData.map(d => d[field]).filter(s => s).slice(start, end)
        return slice[slice.length-1] - slice[0]
    }

    getLastValue(canton, field) {
        return this._data[canton].map(d => d[field]).filter(s => s).slice(-1)[0]
    }
    
    getLastWeek(canton, field) {
        return this.getSeriesChange(canton, field, -7)
    }

    getPriorWeek(canton, field) {
        return this.getSeriesChange(canton, field, -14, -7)
    }
}