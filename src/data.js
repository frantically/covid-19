const SAMPLE_DATA_FIELDS_ALL_NEW = ["casesTotal", "deathsTotal"]

export const SERIES_CASES = "casesTotal"
export const SERIES_DEATHS = "deathsTotal"
export const SERIES_HOSPITALIZED = "hospitalized"
export const SERIES_ICU = "icu"
export const SERIES_VENTILATED = "ventilated"

const ONE_DAY = 24 * 60 * 60 * 1000
const MIN_START_DATE = Date.parse("2020-03-01")

export function formatDate(d) {
    return `${new Date(d).toLocaleDateString("de-CH")}`
}

function _convertCSVToJSON(str, delimiter = ',') {
    const titles = str.slice(0, str.indexOf('\n')).split(delimiter).map(s => s.startsWith("\"") && s.endsWith("\"") ? s.slice(1, -1) : s)
    const rows = str.slice(str.indexOf('\n') + 1).split('\n').map(s => s.replace(/[\x00-\x1F\x7F-\x9F]/g, ""))
    return rows.map(row => {
        const values = row.split(delimiter).map(s => s.startsWith("\"") && s.endsWith("\"") ? s.slice(1, -1) : s)
        return titles.reduce((object, curr, i) => (object[curr] = values[i], object), {})
    })
}

export function csvStringToJson(data, extractor) {
    return _convertCSVToJSON(data)
        .filter(sample => sample.date)
        .map(extractor)
}

export function openZHExtractor(source) {
    return {
        key: `${source.abbreviation_canton_and_fl}_${source.date}`,
        location: source.abbreviation_canton_and_fl,
        date: Date.parse(source.date),
        casesTotal: parseInt(source.ncumul_conf),
        deathsTotal: parseInt(source.ncumul_deceased),
        hospitalized: parseInt(source.current_hosp),
        icu: parseInt(source.current_icu),
        ventilated: parseInt(source.current_vent)
    }
}

export class CoronaStatistics {

    _data = {}

    constructor(data) {
        this._data = this._scaffoldData(data)
    }

    _dateRangeInData(data) {
        var dateRange = data.reduce((a, c) => {
            a.min = Math.min(c.date, a.min)
            a.max = Math.max(c.date, a.max)
            return a
        }, {min: Number.MAX_VALUE , max: 0})
        dateRange.min = Math.max(MIN_START_DATE, dateRange.min)
        return dateRange
    }
    
    _groupByLocationByDate(data) {
        return data.reduce((a, c) => {
            var byDate = a[c.location] || {}
            byDate[c.date] = c
            a[c.location] = byDate
            return a
        }, {})
    }
       
    _scaffoldData(source) {
        var dateRange = this._dateRangeInData(source)
        console.log(`Date Range in data: ${formatDate(dateRange.min)} - ${formatDate(dateRange.max)}`)
        var days = []
        for(var i = dateRange.min;i<= dateRange.max;i = i+ONE_DAY) {
            days.push(i)
        }
        var byLocationByDate = this._groupByLocationByDate(source)
        var result = Object.keys(byLocationByDate).reduce((result, location) => {
            var locationData = byLocationByDate[location]
            result[location] = days.map(date => {
                return locationData[date] ? locationData[date] : {date: date, location: location, scaffold: 1}
            })
            return result
        }, {})
        this._carryForwardAccumlatedValues(result)
        result['CH'] = this._aggregateCH(result)
        Object.values(result).forEach(dataSet => {
            SAMPLE_DATA_FIELDS_ALL_NEW.forEach(field => this._setPeriodTotal(dataSet, field, 7))
        })
        return result
    }

    _carryForwardAccumlatedValues(data) {
        Object.values(data).forEach(cantonData => {
            var lastValue = { }

            //carry forward current value if new value not provided
            cantonData.forEach(sample => {
                SAMPLE_DATA_FIELDS_ALL_NEW.forEach(field => {
                    sample[`${field}_raw`] = sample[field]
                    if(isNaN(sample[field])) {
                        // console.log("carrying for key: " + sample.key)
                        sample[field] = lastValue[field] || 0
                    } else {
                        lastValue[field] = sample[field]
                    }
                })
            })

            //but wipe out any extrapolation after the last value in the underlying data source
            SAMPLE_DATA_FIELDS_ALL_NEW.forEach(field => {
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
            var sample = {date: cantonsData[0][i].date, location: "CH" }
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

    //TODO: REMOVE THIS AS IT'S A SIGN OF OTHER METHODS MISSING LIKE getMovingAverage
    getData(canton) {
        return this._data[canton]
    }

    getSeries(canton, key) {
        return this._data[canton]
            .map(sample => {return {x: sample.date, y: sample[key]}})
    }

    getMovingAverage(canton, accumulativeField, days) {
        return this.getSeries(canton, `${accumulativeField}${days}d`).map(p => { return {x: p.x, y: Math.round(p.y/days)}})
    }

    _setPeriodTotal(data, accumulativeField, days) {
        var result = []
        if(data) {
            for(var i = days ;i<data.length;i++) {
                data[i][`${accumulativeField}${days}d`] = data[i][accumulativeField]-data[i-days][accumulativeField]
            }
        }
        return result
    }

    getMaxDate(canton) {
        return this._data[canton].filter(sample => sample.casesTotal).reduce((result, current) => Math.max(result, current.date), 0)
    }

    _getSeriesChange(canton, field, start, end = undefined) {
        var cantonData = this._data[canton]
        var slice = cantonData.map(d => d[field]).filter(s => s).slice(start, end)
        return slice[slice.length-1] - slice[0]
    }

    getLastValue(canton, field) {
        return this._data[canton].map(d => d[field]).filter(s => s).slice(-1)[0]
    }
    
    getLastWeek(canton, field) {
        return this._getSeriesChange(canton, field, -8)
    }

    getPriorWeek(canton, field) {
        return this._getSeriesChange(canton, field, -15, -7)
    }
}