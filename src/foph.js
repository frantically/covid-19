const MIN_START_DATE = Date.parse("2020-03-01")

export function formatDate(d) {
    return `${new Date(d).toLocaleDateString("de-CH")}`
}

export class CoronaStatisticsFOPH {

    _data = {}

    constructor(casesJson, deathsJson) {
        this._data = casesJson.map(sample => {
                var result = {}
                result.date = Date.parse(sample.datum),
                result.ncumul_conf = sample.sumTotal,
                result.ncumul_conf_7_day = sample.sum7d,
                result.ncumul_conf_7_day_avg = sample.sum7d / 7,
                result.abbreviation_canton_and_fl = sample.geoRegion
                return result
            }
        ).filter(sample => sample.date >= MIN_START_DATE)
    }

    getSeries(canton, key) {
        return this._data
            .filter(sample => sample.abbreviation_canton_and_fl === canton)
            .map(sample => {return {x: sample.date, y: sample[key]}})
    }

    getMovingAverage(canton, accumulativeField, days) {
        return this.getSeries(canton, accumulativeField + "_7_day_avg")
    }

    getCantonData(canton) {
        return this._data.filter(sample => sample.abbreviation_canton_and_fl === canton)
    }

    getMaxDate(canton) {
        return this.getCantonData(canton).filter(sample => sample.ncumul_conf).reduce((result, current) => Math.max(result, current.date), 0)
    }

    getSeriesChange(canton, field, start, end = undefined) {
        return []
        // var cantonData = this._data[canton]
        // var slice = cantonData.map(d => d[field]).filter(s => s).slice(start, end)
        // return slice[slice.length-1] - slice[0]
    }

    getLastValue(canton, field) {
        return this._data.filter(sample => sample.abbreviation_canton_and_fl === canton).map(d => d[field]).filter(s => s).slice(-1)[0]
    }

    getLastWeek(canton, field) {
        return 0
        // return this.getLastValue(canton, field).sum7d
    }

    getLastTwoWeeks(canton, field) {
        return 0
        // return this.getLastValue(canton, field).sum14d
    }
}